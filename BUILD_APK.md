# Инструкция по сборке APK для Авоська+

## Подготовка завершена ✅

Проект уже настроен для создания Android приложения:
- ✅ Capacitor инициализирован
- ✅ Android проект создан в папке `android/`
- ✅ Статический билд собран в папке `out/`
- ✅ Файлы синхронизированы с Android проектом

## Способ 1: Через Android Studio (Рекомендуется)

### Шаги:

1. **Установите Android Studio** (если еще не установлена):
   - Скачайте с https://developer.android.com/studio
   - Установите вместе с Android SDK

2. **Откройте проект**:
   ```
   Файл → Open → Выберите папку d:/1_sites/baraholka/android
   ```

3. **Дождитесь синхронизации Gradle**:
   - Android Studio автоматически скачает зависимости
   - Это может занять несколько минут при первом запуске

4. **Соберите APK**:
   - Меню: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   - Или используйте: `Build → Generate Signed Bundle / APK` для релизной версии

5. **Найдите готовый APK**:
   ```
   d:/1_sites/baraholka/android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Способ 2: Через командную строку (требует JDK)

### Требования:
- Java Development Kit (JDK) 17 или новее
- Android SDK

### Установка JDK:

1. Скачайте JDK 17: https://adoptium.net/
2. Установите и добавьте в PATH
3. Проверьте установку:
   ```powershell
   java -version
   ```

### Сборка APK:

```powershell
# Перейдите в папку android
cd d:/1_sites/baraholka/android

# Соберите debug APK
./gradlew assembleDebug

# Или release APK (требует подписи)
./gradlew assembleRelease
```

### Готовый APK будет здесь:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Обновление приложения после изменений

Когда вы вносите изменения в код:

```powershell
# 1. Пересоберите веб-версию
npm run build

# 2. Синхронизируйте с Android
npx cap sync android

# 3. Соберите новый APK (через Android Studio или gradlew)
```

## Настройка иконки и названия

### Иконка приложения:
Замените файлы в:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
```

### Название приложения:
Отредактируйте:
```
android/app/src/main/res/values/strings.xml
```

## Создание релизной версии для Google Play

1. Создайте keystore для подписи:
   ```powershell
   keytool -genkey -v -keystore avoska-release-key.keystore -alias avoska -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Создайте файл `android/key.properties`:
   ```
   storePassword=ваш_пароль
   keyPassword=ваш_пароль
   keyAlias=avoska
   storeFile=путь/к/avoska-release-key.keystore
   ```

3. Соберите подписанный APK:
   ```powershell
   cd android
   ./gradlew assembleRelease
   ```

## Полезные команды

```powershell
# Открыть Android Studio с проектом
npx cap open android

# Запустить на подключенном устройстве/эмуляторе
npx cap run android

# Проверить логи
npx cap run android --livereload
```

## Поддержка

Если возникли проблемы:
- Документация Capacitor: https://capacitorjs.com/docs
- Документация Android: https://developer.android.com/docs
