import mysql.connector
from mysql.connector import Error
import xml.etree.ElementTree as ET
from xml.dom import minidom
import json
import logging
import os
from datetime import datetime

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("avito_export.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# --- КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ ---
DB_CONFIG = {
    'host': 'localhost',
    'database': 'your_database_name',
    'user': 'your_db_username',
    'password': 'your_db_password',
    'charset': 'utf8mb4'
}

# --- НАСТРОЙКИ ЭКСПОРТА ---
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'avoska_feed.xml')


def connect_to_db():
    """Устанавливает соединение с MySQL базой данных."""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            logging.info("Успешное подключение к базе данных MySQL")
            return connection
    except Error as e:
        logging.error(f"Ошибка при подключении к MySQL: {e}")
        return None

def fetch_products(connection):
    """Извлекает товары из базы данных."""
    try:
        cursor = connection.cursor(dictionary=True) # dictionary=True для доступа по именам колонок
        # Получаем данные товаров. Предполагается, что images хранится как строка JSON.
        query = "SELECT id, name, price, images, description, category FROM products"
        cursor.execute(query)
        products = cursor.fetchall()
        logging.info(f"Извлечено {len(products)} товаров из базы данных")
        return products
    except Error as e:
        logging.error(f"Ошибка при выполнении запроса к БД: {e}")
        return []
    finally:
        if cursor:
            cursor.close()

def generate_xml_feed(products):
    """
    Формирует строгий XML-файл в соответствии с требованиями Avito.
    Официальная документация Avito (Автозагрузка) требует корня <Ads>
    с параметрами formatVersion и target.
    """
    logging.info("Начало генерации XML...")
    
    # Создаем корневой элемент
    root = ET.Element("Ads", formatVersion="3", target="Avito.ru")
    
    success_count = 0
    error_count = 0

    for product in products:
        try:
            # Создаем элемент для каждого объявления
            ad_elem = ET.SubElement(root, "Ad")
            
            # Обязательный: Id
            ET.SubElement(ad_elem, "Id").text = str(product['id'])
            
            # Название товара: Avito обычно использует <Title>
            ET.SubElement(ad_elem, "Title").text = str(product['name']).strip()
            
            # Цена: <Price>
            ET.SubElement(ad_elem, "Price").text = str(product['price'])
            
            # Описание: <Description> (рекомендуется оборачивать в CDATA, если есть HTML, 
            # но ElementTree не поддерживает CDATA напрямую. Экранирование спецсимволов 
            # ET делает автоматически).
            ET.SubElement(ad_elem, "Description").text = str(product['description']).strip()
            
            # Категория: <Category> (должно строго соответствовать справочнику категорий Avito)
            ET.SubElement(ad_elem, "Category").text = str(product['category']).strip()
            
            # Обработка изображений: <Images><Image url="..."/></Images>
            images_data = product.get('images', '[]')
            if images_data:
                # Пытаемся распарсить JSON, если картинки хранятся как массив в тексте
                try:
                    if isinstance(images_data, str):
                        images_list = json.loads(images_data)
                    elif isinstance(images_data, list):
                        images_list = images_data
                    else:
                        images_list = []
                    
                    if images_list:
                        images_elem = ET.SubElement(ad_elem, "Images")
                        for img_url in images_list:
                            if img_url: # Проверка на пустые URL
                                ET.SubElement(images_elem, "Image", url=str(img_url).strip())
                except json.JSONDecodeError:
                    logging.warning(f"Товар ID {product['id']}: Ошибка парсинга поля images.")

            # (Опционально) Здесь можно добавить другие обязательные поля Avito
            # Например: ContactPhone, Address, AvitoId (если есть)

            success_count += 1
        except Exception as e:
            logging.error(f"Ошибка при обработке товара ID {product.get('id', 'Unknown')}: {e}")
            error_count += 1
            # В случае ошибки просто пропускаем добавление битого товара и идем дальше
            continue

    logging.info(f"Сформировано XML для {success_count} товаров. Ошибок: {error_count}")
    return root

def save_pretty_xml(root, filepath):
    """Сохраняет XML-дерево в читаемом формате."""
    try:
        # Преобразуем дерево в строку
        xmlstr = ET.tostring(root, encoding="utf-8")
        # Парсим через minidom для красивого форматирования с отступами
        reparsed = minidom.parseString(xmlstr)
        pretty_xml = reparsed.toprettyxml(indent="  ")
        
        # Удаляем пустые строки, которые minidom может добавить (особенность библиотеки)
        pretty_xml = '\n'.join([line for line in pretty_xml.split('\n') if line.strip()])

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(pretty_xml)
        
        logging.info(f"Файл успешно сохранен по пути: {filepath}")
    except IOError as e:
        logging.error(f"Ошибка при сохранении файла {filepath}: {e}")

def main():
    logging.info("--- Запуск скрипта выгрузки для Avito ---")
    
    # 1. Подключение к БД
    conn = connect_to_db()
    if not conn:
        logging.error("Прерывание: Не удалось подключиться к базе данных.")
        return

    try:
        # 2. Извлечение данных
        products = fetch_products(conn)
        if not products:
            logging.warning("Прерывание: В таблице нет данных или произошла ошибка извлечения.")
            return

        # 3. Трансформация в XML
        xml_root = generate_xml_feed(products)

        # 4. Сохранение файла
        save_pretty_xml(xml_root, OUTPUT_FILE)
        
    finally:
        if conn.is_connected():
            conn.close()
            logging.info("Соединение с MySQL закрыто.")

if __name__ == "__main__":
    main()
