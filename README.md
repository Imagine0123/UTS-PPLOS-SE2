# UTS PPLOS SE2 - Kos Management API Gateway

NIM: 2310511069  
Demo Video: [Demo UTS-PPLOS-SE2](https://youtu.be/7mnrIZv9JRA)

## Deskripsi
Proyek ini mengimplementasikan arsitektur API Gateway untuk Sistem Manajemen Kos. API Gateway bertugas untuk melakukan permintaan ke microservices yang sesuai di belakangnya, serta mencakup Layanan Autentikasi yang terintegrasi dengan GitHub OAuth.

## Prerequisites
* Docker & Docker Compose
* Kredensial GitHub OAuth App (Client ID & Client Secret)

## Cara Menjalankan
1. Clone repositori ini ke komputer lokal.
2. Buat file `.env` di direktori *root* proyek dan tambahkan kredensial GitHub:
   ```env
   GITHUB_CLIENT_ID=client_id_github
   GITHUB_CLIENT_SECRET=client_secret_github```
3. Build dan jalankan container menggunakan Docker Compose:
    docker-compose up --build -d
4. API Gateway sekarang dapat diakses melalui http://localhost:3000