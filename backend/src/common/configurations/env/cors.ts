export const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080'];

export const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Protection'],
}
