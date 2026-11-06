import request from "supertest";
import app from "../src/app.js";

export const api = () => request(app);

// A point ~0.5 km from the Bastille dark store (id 2).
export const NEAR_BASTILLE = { lat: 48.8566, lng: 2.3735 };
// A point far outside every delivery radius (Lyon).
export const FAR_AWAY = { lat: 45.764, lng: 4.8357 };
