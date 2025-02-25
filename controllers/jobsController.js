const User = require("../models/Jobs");
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const signale = require("signale");

const log = signale.scope("jobs:controller");

