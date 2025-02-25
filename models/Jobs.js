const mongoose = require("mongoose");
const AutoIncrement = require('mongoose-sequence')(mongoose);

const jobSchema = new mongoose.Schema({
  category: String,
  postDate: String,
  postBoard: String,
  postName: String,
  qualification: String,
  advtNo: { 
    type: Number, 
    unique: true,
    sparse: true,
  },
  lastDate: Date,
  link: {
    type: String,
    unique: true
  },
  apply_online: String,
  notification: String,
  official_website: String,
  sector: String,
  updateInformation: String,
  applicationFee: String,
  importantDates: String,
  ageLimit: String,
  additionalLinks: Object,
});

jobSchema.plugin(AutoIncrement, { inc_field: 'advtNo' });
const Job = mongoose.model("Job", jobSchema);
module.exports = Job;