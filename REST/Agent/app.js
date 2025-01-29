const express = require('express');
const app = express();
const cors = require('cors');
const { getSystemInfo, rebootSystem } = require('./utilities');

app.use(cors());

app.get('/system-info', async (req, res) => {
    const IP = req.socket.localAddress;

    try {
        const result = await getSystemInfo();

        return res.json({
            success: true,
            timestamp: new Date(),
            IP,
            result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            IP,
            result: {
                error: error.message,
                stack: error.stack
            }
        });
    }
});

app.post("/reboot-system", (req, res, next) => {
    const IP = req.socket.localAddress;

    try {
        res.json({
            success: true,
            timestamp: new Date(),
            IP,
            result: {
                message: "System reboot command executed successfully."
            }
        });

        rebootSystem();
    } catch (error) {
        res.status(500).json({
            success: false,
            IP,
            result: {
                error: error.message,
                stack: error.stack
            }
        });
    }
});

const PORT = 3333;
app.listen(PORT, "0.0.0.0", () => console.log(`Monitoring app listening on port ${PORT}.`));