import os
import urllib.request
import ssl
import time

ssl._create_default_https_context = ssl._create_unverified_context

# Используем LoremFlickr - он обычно доступен
categories = [
    ('transport', 'https://loremflickr.com/400/400/transport'),
    ('real-estate', 'https://loremflickr.com/400/400/house'),
    ('jobs', 'https://loremflickr.com/400/400/office'),
    ('services', 'https://loremflickr.com/400/400/tools'),
    ('electronics', 'https://loremflickr.com/400/400/electronics'),
    ('home', 'https://loremflickr.com/400/400/furniture'),
    ('clothing', 'https://loremflickr.com/400/400/clothes'),
    ('parts', 'https://loremflickr.com/400/400/gears'),
    ('hobby', 'https://loremflickr.com/400/400/camera'),
    ('pets', 'https://loremflickr.com/400/400/dog'),
    ('beauty', 'https://loremflickr.com/400/400/makeup'),
    ('kids', 'https://loremflickr.com/400/400/toys')
]

save_dir = os.path.join("public", "categories")
if not os.path.exists(save_dir):
    os.makedirs(save_dir)

print(f"Downloading from LoremFlickr to {save_dir}...", flush=True)

# User-Agent как у браузера
opener = urllib.request.build_opener()
opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')]
urllib.request.install_opener(opener)

for name, url in categories:
    try:
        filename = os.path.join(save_dir, f"{name}.jpg")
        print(f"Downloading {name}...", end=" ", flush=True)
        # LoremFlickr редиректит на реальный URL картинки
        with urllib.request.urlopen(url) as response:
            real_url = response.geturl()
            # Качаем уже реальную картинку
            urllib.request.urlretrieve(real_url, filename)
        print("OK", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
    time.sleep(1) # Пауза

print("\nDone!", flush=True)
