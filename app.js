const express = require("express");
const app = express()
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const {getData, saveData} = require("./db")
const { getUsers, saveUsers } = require("./db");
const fs = require("fs")
const bcrypt = require("bcryptjs"); 
const session = require("express-session")
const escape = require("escape-html")
const multer = require("multer");
const upload = multer({ dest: "uploads/"});
const profileUpload = multer({ dest: "profile_uploads/" });
const postUpload = multer({ dest: "uploads/" });





function render(content){

    let htmlString = require("fs").readFileSync("index.html").toString();
    htmlString = htmlString.replace("%content%", content);
    return htmlString;


}

app.use(express.urlencoded({extended:true}))

app.use(session(
    {
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7  }
}
));


app.get("/session-info", (req, res) => {
  res.json({
    username: req.session.username || null
  });
});





app.use("/uploads", express.static("uploads"));
app.use("/profile_uploads", express.static("profile_uploads"));

app.get("/debug", (req, res) => {
    res.send(req.session);
});

app.get("/", (req, res) => 
    { res.redirect("/posts"); });

app.get("/posts", log, (req,res) =>{



    const posts = getData();

   let html = posts.map(p => {

    const liked = p.likes.includes(req.session.username);
    const likeText = liked ? "Unlike" : "Like";


    // Kommentarer
    const commentsHtml = (p.comments || []).map((c, i) => `
    <div class="comment">
        <a href="/profile/${encodeURIComponent(c.author)}" class="comment-author">${c.author}</a>: ${c.text}

        ${(c.author === req.session.username || req.session.role === "admin") ? `
            <form action="/posts/comment/delete/${p.id}/${i}" method="POST" style="display:inline;">
                <button class="delete-comment-btn">🗑️</button>
            </form>
        ` : ""}
    </div>
`).join("");

    return `
        <div class="post">
            <img src="/uploads/${p.image}" style="max-width:200px; height:auto;">
            <h3 class="hCenter">${escape(p.desc)}</h3>

            <p>Uploaded by: 
                <a href="/profile/${encodeURIComponent(p.owner)}">${p.owner}</a>
            </p>

            <!-- LIKE -->
            <form action="/posts/like/${p.id}" method="POST">
                <button class="like-btn ${liked ? 'liked' : ''}" data-post="${p.id}">
                    ❤ ${p.likes.length}
                </button>
            </form>

            <!-- COMMENT -->
            <form action="/posts/comment/${p.id}" method="POST">
                <input type="text" name="comment" placeholder="Write a comment">
                <button class="comment-btn" id="comments-${p.id}">💬</button>
            </form>

            <div class="comments">
                ${commentsHtml}
            </div>

            <!-- DELETE + EDIT (endast ägare eller admin) -->
            ${(req.session.username === p.owner || req.session.role === "admin") ? `
                <form action="/posts/delete/${p.id}" method="POST">
                    <button class="delete-btn">🗑️</button>
                </form>

                <form action="/posts/edit/${p.id}" method="GET">
                    <button class="edit-btn">✏️</button>
                </form>
            ` : ""}
        </div>
    `;
}).join("");



    if(req.query.error){

        html = `<h2 style = "text-align:center; color:red">${req.query.error}</h2>` + html


    }

    res.send(render(html))
})

app.get("/posts/create", log, (req,res) =>{



  res.sendFile(__dirname + "/createPost.html")


})




app.post("/posts/create", log, upload.single("image"), (req, res) => {

  
  const post = {
      id: Date.now(),
      desc: req.body.desc,      // texten
      image: req.file.filename,  // bilden
      owner: req.session.username,  //ägaren
      likes: [],
      comments: []
  };

  const allPosts = getData();
  allPosts.push(post);
  saveData(allPosts);
  res.redirect("/posts");
});



/*app.get("/posts/create", log, isAdmin, (req,res) =>{

    //if(!req.session.auth) return res.send(render("FORBIDDEN"))

    // Hämtar data från queryString
    const post = req.query;
    // Genererar ett unikt id.
    product.id = Date.now();

    // Hämtar alla posts -> detta blir en array
    const allPosts = getData();

    // Lägg till vår nya post i allPosts
    allPosts.push(post);

    // Spara alla posts till json fil med hjälp av vår nybyggda funktion som ligger i db.js
    saveData(allPosts);

    // Istället för att skicka data så skickar vi användaren tillbaka till route / där alla posts redan visas.
    res.redirect("/posts")

})*/


app.post("/posts/delete/:id", log, (req,res) =>{

    // Hämta id från url via params
    const id = Number(req.params.id);
    // hämta alla produkter som ligger lagrade i json-fil.
    const posts = getData();

    const post = posts.find(p => p.id === id);

    const isOwner = post.owner === req.session.username; 
    const isAdmin = req.session.role === "admin"; 

    if (!isOwner && !isAdmin) 
      { return res.redirect("/posts?error=Access Denied"); }

    // Skapa ny array med alla produkter som INTE har det id som användaren skickat in
    const filteredPosts = posts.filter(p=> p.id != id)

    saveData(filteredPosts);

    res.redirect("/posts?"+id+"_is_deleted");



})


function log(req, res, next){


    console.log(req.url)
    let counterObj = JSON.parse(require("fs").readFileSync("log.json").toString());

    if (counterObj[req.url]) counterObj[req.url]++;
    else counterObj[req.url] = 1;

    require("fs").writeFileSync("log.json", JSON.stringify(counterObj, null, 3));


    next()
}


app.get("/register", (req,res)=>{


/*  if (req.session.auth) {
    return res.redirect("/");
  } */

    res.sendFile(__dirname + "/register.html");

})





app.post("/register", log, (req,res) =>{



    const email = req.body.email;
    const username = req.body.username;
    const password = bcrypt.hashSync(req.body.password, 12);
    const id = "id_"+Date.now();  
    const users = JSON.parse(fs.readFileSync("users.json").toString());


    if(users.find(u=>u.email == email)) return res.send("User Already Exists")

    users.push({id, email, username, password, role:"user"});

    fs.writeFileSync("users.json", JSON.stringify(users, null, 3))

    res.redirect("/?users_created")
    

  


})


app.get("/login", (req,res)=>{


/*  if (req.session.auth) {
    return res.redirect("/");
  } */

    res.sendFile(__dirname + "/login.html");

})


app.post("/login", log, (req,res) =>{


    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.role;
    const users = JSON.parse(fs.readFileSync("users.json").toString());


    const user = users.find(u=>u.email == email); 

    if(!user) return res.send("No user found!")

    const passwordCheck = bcrypt.compareSync(password, user.password)

    if(!passwordCheck) return res.send("Wrong Password!")


    req.session.auth = true
    req.session.email = user.email
    req.session.username = user.username;
    req.session.role = user.role

    

    res.redirect("/?logged_in")

})


function isUser(req, res, next) {
  if (!req.session.auth) return res.redirect("/posts?error=Access Denied");
  if (req.session.role !== "user" && req.session.role !== "admin")
    return res.redirect("/posts?error=Access Denied!");
  next();
}

function isAdmin(req, res, next) {
  if (!req.session.auth) return res.redirect("/posts?error=Access Denied!");

  if (req.session.role !== "admin")
    return res.redirect("/posts?error=Access Denied!");
  next();
}


app.post("/posts/like/:id", log, (req, res) => {
    const id = Number(req.params.id);
    const posts = getData();
    const post = posts.find(p => p.id === id);

    if (!post) {
        return res.redirect("/posts?error=Post not found");
    }

    const userEmail = req.session.email;

    if (!userEmail) {
        return res.redirect("/login");
    }

    // ⭐ Toggle like
    if (post.likes.includes(userEmail)) {
        post.likes = post.likes.filter(email => email !== userEmail);
    } else {
        post.likes.push(userEmail);
    }

    saveData(posts);

    io.emit("likeUpdate", {
    postId: post.id,
    likes: post.likes.length
    });

    res.redirect("/posts");
});






/// debugging

app.get("/session", log, (req,res) =>{

    res.send(req.session);

})


app.get("/logout", (req,res) => {
  req.session.destroy(err => {
    if (err) {
      return res.send("Error logging out");
    }
    res.redirect("/?logged_out");
  });
});


app.get("/posts/edit/:id", log, (req, res) => {
    const id = Number(req.params.id);
    const posts = getData();
    const post = posts.find(p => p.id === id);

    if (!post) return res.send("Post not found");

    const isOwner = post.owner === req.session.username;
    const isAdmin = req.session.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.redirect("/posts?error=Access Denied");
    }

    let html = fs.readFileSync("editPost.html").toString();
    html = html.replace("{{id}}", post.id);
    html = html.replace("{{desc}}", post.desc);

    console.log("SESSION USER:", req.session.username);
    console.log("POST OWNER:", post.owner);


    res.send(html);
});



app.post("/posts/edit/:id", log, postUpload.single("postImage"), (req, res) => {

    const id = Number(req.params.id);
    const posts = getData();
    const post = posts.find(p => p.id === id);

    if (!post) return res.send("Post not found");

    const isOwner = post.owner === req.session.username;
    const isAdmin = req.session.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.redirect("/posts?error=Access Denied");
    }

    // Update caption
    post.desc = req.body.desc;

    if (req.file) {
        post.image = req.file.filename;
    }

    saveData(posts);
    res.redirect("/posts?edited=" + id);
});


app.post("/posts/comment/:id", log, (req, res) => {
    const id = Number(req.params.id);
    const posts = getData();
    const post = posts.find(p => p.id === id);

    if (!post) {
        return res.redirect("/posts?error=Post not found");
    }

    const commentText = req.body.comment;
    const userEmail = req.session.email;

    if (!commentText.trim()) {
        return res.redirect("/posts?error=Empty comment");
    }

    //  Lägg till kommentaren
    post.comments.push({
        text: commentText,
        author: req.session.username,
        time: Date.now()
    });

    saveData(posts);

    io.emit("newComment", {
    postId: post.id,
    author: req.session.username,
    text: commentText
        });

    res.redirect("/posts");
});


app.post("/posts/comment/delete/:postId/:commentIndex", log, (req, res) => {
    const postId = Number(req.params.postId);
    const commentIndex = Number(req.params.commentIndex);

    const posts = getData();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return res.redirect("/posts?error=Post not found");
    }

    const comment = post.comments[commentIndex];

    if (!comment) {
        return res.redirect("/posts?error=Comment not found");
    }

    const isOwner = comment.author === req.session.username;
    const isAdmin = req.session.role === "admin";

    if (!isOwner && !isAdmin) {
        return res.redirect("/posts?error=Access Denied");
    }

    // Ta bort kommentaren
    post.comments.splice(commentIndex, 1);

    saveData(posts);
    res.redirect("/posts");
});

app.post("/follow/:username", log, (req, res) => {
    const target = req.params.username;          // personen du följer
    const current = req.session.username;        // du själv

    const users = getUsers();                    // eller getData(), beroende på din struktur

    const user = users.find(u => u.username === target);   // ✔ personen du följer
    const me = users.find(u => u.username === current);    // ✔ du själv

    if (!user || !me) {
        return res.redirect("/posts?error=User not found");
    }

    // Toggle follow
    const isFollowing = me.following.includes(target);

    if (!isFollowing) {
        // FOLLOW
        me.following.push(target);
        user.followers.push(current);
    } else {
        // UNFOLLOW
        me.following = me.following.filter(u => u !== target);
        user.followers = user.followers.filter(u => u !== current);
    }

    saveUsers(users);

    // 🔥 WebSocket event
    io.emit("followUpdate", {
        username: target,
        followers: user.followers.length
    });

    res.redirect("/profile/" + target);
});



app.get("/profile/:username", (req, res) => {
    const username = req.params.username;
    const posts = getData();

    // Hitta alla poster som användaren äger
    const userPosts = posts.filter(p => p.owner === username);

    // Räkna totala likes
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likes.length, 0);

    // Räkna totala uppladdningar
    const totalUploads = userPosts.length;

    // Hämta användare från users.json
    const users = JSON.parse(fs.readFileSync("users.json").toString());
    const user = users.find(u => u.username === username);


    if (!user) {
     return res.send(`
            <h1>User not found</h1>
            <p>Username: ${username}</p>
            <p>This means the username in the URL does not match any user in users.json.</p>
    `);
}


    let html = `
    <div class="profileCSS">
        <h1>Profile: ${username}</h1>

        <img src="/profile_uploads/${user.profileImage || 'default.png'}" 
             class="profile-pic">

        {{uploadForm}}

        {{followBtn}}

        <p><strong>Uploaded Posts:</strong> ${totalUploads}</p>
        <p><strong>Total Likes:</strong> ${totalLikes}</p>
        <p><strong>Followers:</strong> ${user.followers.length}</p>

        <h2>All Posts:</h2>
    </div>
`;

if (req.session.username === user.username) {
    html = html.replace("{{uploadForm}}", `
      <div class="profilePic">
    <form action="/profile/upload" method="POST" enctype="multipart/form-data">

        <label class="file-label">
            Choose Picture
            <input type="file" name="profileImage" accept="image/*">
        </label>

        <input type="submit" value="Change Profile Picture" class="submit-btn">

    </form>
</div>


    `);
} else {
    html = html.replace("{{uploadForm}}", "");
}

    




    // ⭐ Följ-knapp (om det inte är din egen profil)
    if (req.session.username && req.session.username !== username) {
    html = html.replace("{{followBtn}}", `
        <form action="/follow/${username}" method="POST">
            <button class="follow-btn ${user.followers.includes(req.session.username) ? 'following' : ''}">
                <span class="icon" id="followers-${username}">${user.followers.length}</span>
            </button>
        </form>
    `);
} else {
    html = html.replace("{{followBtn}}", "");
}


    // Visa alla poster användaren laddat upp
    html += userPosts.map(p => `
        <div class="post">
            <img src="/uploads/${p.image}" style="max-width:200px;">
            <p>${p.desc}</p>
            <p>Likes: ${p.likes.length}</p>
        </div>
    `).join("");

    res.send(render(html, req));
});



app.post("/profile/upload", profileUpload.single("profileImage"), (req, res) => {
    const users = getUsers();
    const me = users.find(u => u.username === req.session.username);

    if (!me) return res.redirect("/profile/" + req.session.username);

    me.profileImage = req.file.filename; // Spara filnamnet

    saveUsers(users);
    res.redirect("/profile/" + req.session.username);
});



server.listen(3456, () => console.log("Server running on http://localhost:3456"));


