const express = require('express');
const app = express();
const path = require('path');

app.get("/", (req, res, next) => {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 8000;
app.listen(PORT, () => console.log(`Monitoring app listening on port ${PORT}.`));