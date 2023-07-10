const express = require('express');
const ejs = require('ejs');
const firebase = require('firebase');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);
const port = process.env.port || 5500;

// kickstart express
const app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Cache-Control", "no-cache");
    next();
});

// this should make CSS work?
app.use(express.static(__dirname + '/public'));
// this should make API work?
app.use('/api', require('./routes/api'));
// app requirements for JSON and shid
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');

// listen to app
app.listen(port, function(){
    console.log('listening to some peeps:' + port); //a joke, ok? it's logged to let the devs know it's online.
})

// firebase kickstarter
const firebaseConfig = {
    //reads, writes and OAuth Scopes are unrestricted, yet only users that are signed-in can read and write data to/from firebase.auth().currentUser
    apiKey: "AIzaSyAMo9JcJdFEsXlKh3bHc5H-hX8fq41vIaU",
    authDomain: "crispy-chat.firebaseapp.com",
    databaseURL: "https://crispy-chat-default-rtdb.firebaseio.com",
    projectId: "crispy-chat",
    storageBucket: "crispy-chat.appspot.com"
};
const dbapp = firebase.initializeApp(firebaseConfig);

const store = firebase.firestore();

// check auth status
function checkAuth(req, res, next) {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      const userRef = store.collection('users').doc(currentUser.uid);
      userRef.get().then(doc => {
        if (doc.exists) {
          req.username = doc.data().name;
          req.avatar = doc.data().img;
          req.discriminator = doc.data().tag;
          req.banner = doc.data().banner;
        }
        next();
      });
    } else {
      next();
    }
  }

// login page
app.get('/auth', function (req, res) {
    res.render('pages/auth', {username: null});
});

// begin new user thing

// the random thing for tag's

// TO-DO: TEST HOW GOOD THIS IS!!1!

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

// adding users to the DB
app.post('/auth/signup', (req, res) => {
    const tag = getRandomInt(1000, 9999);
    const email = req.body.email;
    const password = req.body.password;
  
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // User is authenticated
        const user = userCredential.user;
        const uid = user.uid;
        // create the users doc
        store.collection('users').doc(uid).set({
            username: req.body.username,
            tag: tag,
            img: 'https://tallerthanshort.github.io/ut3.ggpht/icons/crispy.png'
        }).then(() => {
            // User data saved successfully
            res.status(200).send('OK');
          }).catch((error) => {
            // Error saving user data
            const errorMessage = error.message;
            console.error(errorMessage);
            res.status(500).send(errorMessage);
          });
      })
      .catch(error => {
        // Authentication failed
        const errorMessage = error.message;
        console.error(errorMessage);
        res.status(401).send(errorMessage);
      });
  });

// authorise existing user
app.post('/auth/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
  
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(() => {
        // User is authenticated
        res.status(200).send('OK');
      })
      .catch(error => {
        // Authentication failed
        const errorMessage = error.message;
        console.error(errorMessage);
        res.status(401).send(errorMessage);
      });
  });

// load frontend
app.get('/', checkAuth, function (req, res) {
  const username = req.username;
    res.render('pages/index', {
      username: username
    });
});

//welcome page!
app.get('/onboarding', checkAuth, function (req, res) {
  const username = req.username;
    res.render('pages/welcome', {
      username: username
    });
});

// Below is a WIP file uploading system. We don't expect this to be functional for the next few years
/* app.post('/upload', async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }

      const file = req.files['file'][0];
      const coverIMG = req.files['cover'][0];
      const name = req.body.name;
      let uploader = "";

      // Find the current user's username and set it as the uploader
      const userDoc = await store.collection("users").doc(firebase.auth().currentUser.uid).get();
      uploader = userDoc.data().username;

      // Upload files to Firebase Storage
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(file.originalname);
      const coverRef = storageRef.child(coverIMG.originalname);
      const [fileSnapshot, coverSnapshot] = await Promise.all([
        fileRef.put(file.buffer),
        coverRef.put(coverIMG.buffer)
      ]);

      // Create doc in Firestore tracks collection
      const source = await fileSnapshot.ref.getDownloadURL();
      const cover = await coverSnapshot.ref.getDownloadURL();
      const trackDocRef = await store.collection('tracks').add({
        name,
        source,
        cover,
        uploader,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update the track document with the ID as the link
      const trackId = trackDocRef.id;
      await trackDocRef.update({
        link: trackId
      });

      res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
}); */

// load app landing
app.get('/app', checkAuth, function (req, res) {
  const username = req.username;
  if (!username) {
    console.log("no username?")
    res.redirect('/auth');
  } else {
    var guildRef = store.collection('users').doc(firebase.auth().currentUser.uid).collection('joined');
    guildRef.get().then(snapshot => {
      const guilds = snapshot.docs.map(doc => doc.data());
      console.log(guilds)
      res.render('pages/home', {
        username: username,
        guildData: guilds,
      });
    })
  }
})

// load app guilds
app.get('/app/:id', checkAuth, function (req, res) {
  const username = req.username;
  if(req.params.id === 'mobile.js') return; // for some reason the req.params.id keeps returning this 'mobile.js' value, so we're just gonna skip it.
  var toFind = req.params.id;
  if (!username) {
    res.redirect('/auth');
  } else {
    var guildRef = store.collection('users').doc(firebase.auth().currentUser.uid).collection('joined');
    guildRef.get().then(snapshot => {
      const guilds = snapshot.docs.map(doc => doc.data());
      const docRef = store.collection('guilds').doc(toFind);
      docRef.get().then((doc) => {
        if(doc.exists){
          res.render('pages/app', {
            username: username,
            title: doc.data().title,
            guildData: guilds,
          });
        } else {
          res.render('pages/home', {
            username: username,
            guildData: guilds,
          });
        }
      });
    })
  }
});

// load settins page
app.get('/settings', checkAuth, function (req, res){
  const username = req.username;
  const discriminator = req.discriminator;
  const avatar = req.avatar;
  const banner = req.banner;
  let mail = ""

  if(!firebase.auth().currentUser) {
    mail = null;
  } else {
    mail = firebase.auth().currentUser.email;
  }
  if(!username){
    res.redirect('/auth');
  } else {
    store.collection("users").doc(firebase.auth().currentUser.uid).collection("badges").get().then(snapshot => {
      const badges = snapshot.docs.map(doc => doc.data());
      res.render('pages/settings', {
        username: username,
        discriminator: discriminator,
        avatar: avatar,
        banner: banner,
        email: mail,
        badges: badges
      })
    })
  }
})

// load invite error
app.get('/invite', checkAuth, function (req, res){
  const username = req.username;
    res.render('pages/invite', {
      username: username,
      rebounce: null,
      title: 'Invalid Invite | Crispy',
    })
})

// load invite error
app.get('/invite/:id', checkAuth, function (req, res){
  const username = req.username;
  if(req.params.id === 'mobile.js') return;
  
  var inviteDoc = store.collection('invites').doc(req.params.id);

  inviteDoc.get().then(snapshot => {
    if(snapshot.exists){
      res.render('pages/invite', {
        username: username,
        rebounce: snapshot.data().expire,
        title: `${snapshot.data().title}`,
      })
    } else {
      res.render('pages/invite', {
        username: username,
        rebounce: null,
        title: 'Invalid Invite | Crispy',
      })
    }
  })
})