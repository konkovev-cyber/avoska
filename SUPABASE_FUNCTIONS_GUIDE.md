# Инструкция по развертыванию функций

Так как сайт экспортируется как **статический** (`output: 'export'`), стандартные API-роуты Next.js на живом сервере не работают. Все серверные операции перенесены в **Supabase Edge Functions**.

## 1. Деплой функций
Выполните команды в корне проекта:
```bash
supabase functions deploy payments
supabase functions deploy feed-import
```

## 2. Настройка переменных окружения в Supabase
Функциям нужны доступы к ЮKassa. Установите их через CLI:
```bash
supabase secrets set YOOKASSA_ACCOUNT_ID=1042738
supabase secrets set YOOKASSA_SECRET_KEY=test_O8NfU598YJ-vX7vK36_f_J_X_W_Q_u_Y_O_K_O_8
supabase secrets set SITE_URL=https://avoska.353290.ru
```

## 3. Настройка Webhook в ЮKassa
В личном кабинете ЮKassa укажите адрес для уведомлений:
`https://tgesidmolbcqaluhphos.supabase.co/functions/v1/payments?type=webhook`
(Замените ID проекта на свой, если он отличается).
