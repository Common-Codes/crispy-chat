const express = require('express');
const router = express.Router();

// get function on /api (to see if the API is online)
router.get('/', function(req, res, next){
    res.send({ "title": 'Crispy', "formerly": 'Crispy-Chat', "desc": "Open Source jankyCord implementation using EJS, Firebase and some internet magic!", "Metadata": { "internalRepr": {"Map(0)": {}, options: {}} } });
    next();
});

// get function on /api/join
router.get('/join', function(req, res, next){
    res.send({ "name": 'Crispy', "desc": "This is the API path for invites!" });
    next();
});

module.exports = router;