-- Add 10 test banners with RU-friendly images (Yandex MDS)
DELETE FROM public.banners;

INSERT INTO public.banners (title, content, image_url, link_url, is_active)
VALUES
    ('iPhone 16 Pro', 'Новинка уже в продаже! Лучшая цена в городе.', 'https://avatars.mds.yandex.net/get-mpic/11394341/2a0000019230678e38d745e6566089307c92/600x600', '/category/electronics', true),
    ('Уютные дома', 'Продажа и аренда недвижимости в Горячем Ключе.', 'https://avatars.mds.yandex.net/get-pdb/1025539/04d4128f-7f70-4d01-a7eb-6d0ac46da1fd/s1200', '/category/real-estate', true),
    ('Работа рядом', 'Более 100 свежих вакансий каждый день.', 'https://avatars.mds.yandex.net/get-zen_doc/1585805/pub_5d8091a92beb4900ad30ee7a_5d8092284386a100ad8c0490/scale_1200', '/jobs', true),
    ('Автомобили', 'Проверенные авто с пробегом и новые поступления.', 'https://avatars.mds.yandex.net/get-verba/787013/2a000001609d172e8c61689307d6c5d5/1200x900', '/category/transport', true),
    ('Мастер на час', 'Бытовой ремонт любой сложности. Быстро и надежно.', 'https://avatars.mds.yandex.net/get-pdb/1947211/3e09848e-2826-4074-9844-09854497554d/s1200', '/services', true),
    ('Гаджеты и девайсы', 'Большой выбор электроники по выгодным ценам.', 'https://avatars.mds.yandex.net/get-mpic/4012534/img_id279167385966453956.jpeg/600x600', '/category/electronics', true),
    ('Модная одежда', 'Обновите гардероб. Скидки на прошлые коллекции.', 'https://avatars.mds.yandex.net/get-zen_doc/1900137/pub_5d3e85e4ac412400ae4a9544_5d3e868f9515f500ad99d755/scale_1200', '/category/clothing', true),
    ('Всё для дома', 'Мебель, декор и хозтовары в одном месте.', 'https://avatars.mds.yandex.net/get-pdb/1531633/2c6a0b94-8f9f-44e2-8d76-8d76c66938a9/s1200', '/category/home', true),
    ('Товары для детей', 'Игрушки, одежда и обучение для ваших малышей.', 'https://avatars.mds.yandex.net/get-zen_doc/5233157/pub_61168f8e0d4c131557009405_61168fc33f5d5440787e95b0/scale_1200', '/category/kids', true),
    ('Хобби и отдых', 'Всё для рыбалки, охоты и активного туризма.', 'https://avatars.mds.yandex.net/get-pdb/1008061/8c6e2646-6468-466d-9669-96696b9933a9/s1200', '/category/hobby', true);
