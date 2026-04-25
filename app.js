require("dotenv").config();
console.log(process.env.SECRET);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const reviews = require("./models/review.js");
const wrapAsync = require("./utils/wrapAsync.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const Review = require('./models/review');
const { listingSchema } = require("./schema.js");
const passport= require("passport");
const localStrategy = require("passport-local");
const user= require("./models/user.js");
const multer =require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({storage});


// const session = require("express-session");
// const flash = require("connect-flash");
// const sessionOptions = {
//   secret:"mysupersecretstring",
//   resave:false,
//   saveUninitiated:true,
 
// };

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

class ExpressError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(session(sessionOptions));
// app.use(flash);

// app.use((req,res,next)=>{
//   res.locals.success = req.flash("success");
//   next();
// });

app.get("/", (req, res) => {
  res.redirect("/listings");
});

const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body || {});
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};


//Index Route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
});

//New Route
app.get("/listings/new", (req, res) => {
  res.render("listings/new");
});

//Show Route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show", { listing });
});

//Create Route
app.post(
  "/listings",
  upload.single("listing[image]"),
  (req, res, next) => {
    req.body.listing = req.body.listing || {};
    if (req.file) {
      req.body.listing.image = req.file.path;
    }
    next();
  },
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
  })
);

// helper to guard valid ObjectIds
function validateId(req, res, next) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.warn("Invalid ObjectId provided:", id);
    return res.redirect("/listings");
  }
  next();
}

//Edit Route
app.get("/listings/:id/edit", validateId, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) return res.status(404).send("Listing not found");
  res.render("listings/edit", { listing });
});

//Update Route
app.put("/listings/:id", validateId, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if (!listing) return res.status(404).send("Listing not found");
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", validateId, async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

//reviews
//post route

app.post(
  "/listings/:id/reviews",
  upload.single("listing[image]"),
  wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
  })
);

// app.get("/testListing", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "My New Villa",
//     description: "By the beach",
//     price: 1200,
//     location: "Calangute, Goa",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("sample was saved");
//   res.send("successful testing");
// });

app.get("/getcookies", (req,res)=>{
  res.cookie("greet","hello");
  res.send("send you some cookies");
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).send(message);
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
