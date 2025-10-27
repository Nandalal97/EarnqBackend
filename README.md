
# 🧠 EarnQ Backend

**EarnQ** is a scalable backend built using **Node.js**, **Express**, and **MongoDB**, designed to power the EarnQ platform — managing users, quiz logic, transactions, referrals, and more.

---

## 🚀 Tech Stack

| Category | Technology |
|-----------|-------------|
| Runtime | Node.js (v18+) |
| Framework | Express.js |
| Database | MongoDB / Mongoose |
| Authentication | JWT (JSON Web Tokens) |
| Caching | NodeCache |
| Environment | dotenv |
| Payment Gateway | Cashfree |
| AI Integration | OpenAI API |
| Cloud | AWS (S3 for storage, EC2 for API, SES for mail) |

---

## 🧩 Project Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Nandalal97/EarnqBackend.git
cd EarnqBackend
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Create a `.env` file
Create a `.env` file in the root directory with your configuration variables:

```bash
PORT=5000
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_bucket_name

# Cashfree
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Others
NODE_ENV=development
```

---

## ⚙️ Run the server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server will start at:
```
http://localhost:5000
```

---

## 📁 Project Structure

```
EarnQ_Backend/
│
├── src/
│   ├── config/           # Database, AWS, Cashfree, etc.
│   ├── controllers/      # Request handlers
│   ├── models/           # Mongoose models
│   ├── routes/           # Express route definitions
│   ├── middleware/       # Auth & validation middleware
│   ├── utils/            # Helper utilities
│   ├── services/         # Business logic
│   └── app.js            # Main Express app setup
│
├── .env.example          # Example environment file
├── .gitignore
├── package.json
└── README.md
```

---

## 🔐 Environment & Security Notes

- Never commit `.env` or any secret key.
- Rotate API keys if previously exposed.
- Use **HTTPS** in production.
- Keep all dependencies updated regularly.

---

## 🧪 API Testing

You can use:
- **Postman / Thunder Client**
- **cURL**

Example:
```bash
curl http://localhost:5000/api/
```

---

## 🪶 Deployment (Optional)

You can deploy this backend on:

- **Render**
- **Vercel (Serverless API)**
- **AWS EC2**
- **DigitalOcean**
- **Railway.app**

Ensure you set all environment variables in your host’s dashboard.

---

## 🤝 Contributing

1. Fork the repo  
2. Create a new branch: `git checkout -b feature-name`  
3. Commit changes: `git commit -m "Add feature name"`  
4. Push branch: `git push origin feature-name`  
5. Create a Pull Request  

---

## 📧 Contact

**Developer:** Nandalal Majhi  
📩 [developer.nandalal@gmail.com](mailto:developer.nandalal@gmail.com)  
🌐 [https://mnandalal.in](https://mnandalal.in)

