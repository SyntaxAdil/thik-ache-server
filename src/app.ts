import express from "express";
const app = express();
import cors from "cors";
import { connectDB } from "./config/db.ts";
import routes from "./routes/index.js";

app.use(express.json());
app.use(cors());
connectDB();

app.use("/api", routes);

export default app;