import os
import urllib.request
import ssl
import time

# Отключаем проверку SSL (часто помогает при проблемах с сетью)
ssl._create_default_https_context = ssl._create_unverified_context

# Список категорий и ID картинок с Picsum (высокое качество, тематические)
categories = [
    ('transport', 'https://picsum.photos/id/1071/400/400'),
    ('real-estate', 'https://picsum.photos/id/1031/400/400'),
    ('jobs', 'https://picsum.photos/id/1/400/400'),
    ('services', 'https://picsum.photos/id/1070/400/400'),
    ('electronics', 'https://picsum.photos/id/367/400/400'),
    ('home', 'https://picsum.photos/id/1062/400/400'),
    ('clothing', 'https://picsum.photos/id/1059/400/400'),
    ('parts', 'https://picsum.photos/id/252/400/400'),
    ('hobby', 'https://picsum.photos/id/96/400/400'),
    ('pets', 'https://picsum.photos/id/237/400/400'),
    ('beauty', 'https://picsum.photos/id/360/400/400'),
    ('kids', 'https://picsum.photos/id/1084/400/400')
]

save_dir = os.path.join("public", "categories")
if not os.path.exists(save_dir):
    os.makedirs(save_dir)

print(f"Start downloading to {save_dir}...", flush=True)

opener = urllib.request.build_opener()
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
urllib.request.install_opener(opener)

for name, url in categories:
    try:
        filename = os.path.join(save_dir, f"{name}.jpg")
        print(f"Downloading {name}...", end=" ", flush=True)
        urllib.request.urlretrieve(url, filename)
        print("OK", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
    time.sleep(0.5)

print("\nAll downloads finished!", flush=True)
