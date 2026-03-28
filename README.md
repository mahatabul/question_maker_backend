# 🧠 Question Maker Backend

A secure and scalable backend system for generating and managing questions, built with Node.js, Express, FastAPI and MongoDB. This project includes authentication, credit-based usage, email verification, password reset, and advanced security features.

---

## 🚀 Features

### 🔐 Authentication & Security
- User registration & login (JWT-based)
- Email verification system
- Password reset with one-time secure tokens
- Role-based access control (RBAC)
- Rate limiting (anti-spam & brute-force protection)
- Progressive login delay system (anti-brute-force)

---

### 💳 Credit System
- Users receive credits upon registration
- Credits are consumed when accessing features
- Recharge system (payment integration planned)
- Transaction history tracking

---

### 🧾 User Features
- Profile management
- Secure password handling (bcrypt hashing)
- Email notifications (via Nodemailer)

---

### 📊 Wallet System
- Check balance
- Recharge credits
- View transaction history

---

### 🛡️ Security Best Practices
- Input validation (Joi)
- Password hashing (bcrypt)
- Secure token handling (JWT + crypto)
- Protection against brute-force attacks
- Clean middleware architecture

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT
- **Validation:** Joi
- **Email Service:** Nodemailer
- **Security:** bcrypt, crypto

---

## 📁 Project Structure


```bash
.
├── backend/ # Node.js (Express API)
│ ├── controllers
│ ├── middleware
│ ├── models
│ ├── routes
│ ├── utils
│ ├── validators
│ └── app.js
│
├── py_backend/ # Python (FastAPI service)
│ ├── app/
│ ├── main.py
│ └── requirements.txt
│
├── start.sh # Runs both services
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file:

PORT=your_port_number
MONGO_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret
JWT_LIFETIME=1d

JWT_RESET_SECRET=your_reset_secret

BASE_URL=your_base_url

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password

MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=600000


---

## ▶️ Getting Started

### 1. Install dependencies

npm install


### 2. Run the server

npm run dev


### 3. API Base URL

http://localhost:5000/api/v1


---

## 📌 API Endpoints

### 🔐 Auth
- `POST /register`
- `POST /login`
- `GET /verify/:token`
- `POST /forgot-password`
- `POST /reset-password/:token`

### 💰 Wallet
- `POST /recharge`
- `GET /balance`
- `GET /history`

---

## 🔥 Future Improvements

- Payment integration (SSLCommerz, bKash, Nagad)
- Refresh token system
- API key system
- Admin dashboard
- Logging & monitoring system

---

## 🧠 Learning Focus

This project focuses on:
- Backend architecture
- API security
- Authentication systems
- Real-world best practices

---

## 📜 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

Developed by **Rozin Safa**
