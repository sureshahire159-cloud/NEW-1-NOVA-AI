import serverless from "serverless-http";
import express from "express";
import { app } from "../../server";

const wrapper = express();
wrapper.use('/.netlify/functions/api', app);
wrapper.use(app);

export const handler = serverless(wrapper);
