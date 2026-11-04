import express, { Application } from 'express';
import cors from 'cors';
import { Handlers } from './handlers';

const app: Application = express();
const port = process.env.PORT || 5100;

app.use(express.urlencoded({ extended: false }));
app.use(cors());

const handlers = new Handlers();

app.get('/', handlers.getRoot);
//Get Graph
app.get('/graph', handlers.getGraph);

app.get('/data', handlers.getData);

// Only listen when running locally; on Vercel the exported app is invoked as a serverless function.
if (!process.env.VERCEL) {
    app.listen(port, (): void => {
        console.log(`Server is Running on Port ${port}`);
    });
}

export default app;
