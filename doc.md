# Dokumentation


### Render
```js
function render(content){

    let htmlString = require("fs").readFileSync("index.html").toString();
    htmlString = htmlString.replace("%content%", content);
    return htmlString;
}

```
render(content) är en funktion som fungerar som en enkel template‑motor.
Den läser in index.html, letar efter placeholdern %content%, ersätter den med det dynamiska innehållet som skickas in, och returnerar den färdiga HTML‑sidan.
***
### Upload
```js
app.use("/uploads", express.static("uploads"));
```
app.use("/uploads", express.static("uploads")) gör mappen uploads publik så att bilder som laddas upp kan visas i webbläsaren. Utan denna rad skulle inga uppladdade bilder kunna hämtas eller visas på sidan.
***
### Like Kontroll
```js
const liked = p.likes.includes(req.session.username);
const likeText = liked ? "Unlike" : "Like";
```
Koden kontrollerar om den inloggade användaren redan har gillat en post.
Om användaren finns i postens likes‑lista visas knappen "Unlike", annars visas "Like".r
***
### Kommentera och ta bort kommentar
```js
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
```
Koden genererar HTML för alla kommentarer på en post.
Den visar varje kommentar med författarens namn som en profil‑länk.
Om den inloggade användaren är kommentarsförfattaren eller admin visas även en radera‑knapp.
Alla kommentarer slås sedan ihop till en enda HTML‑sträng som kan läggas in i sidan.
***
### Delar av Post
```js
const post = {
      id: Date.now(),
      desc: req.body.desc,      // texten
      image: req.file.filename,  // bilden
      owner: req.session.username,  //ägaren
      likes: [],
      comments: []
  };
```
Objektet skapar en ny post med unikt ID, text, bild, ägare och tomma listor för likes och kommentarer. Det används för att spara och visa inlägg i applikationen.
***
### Delete
```js
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
```
Koden tar bort en post genom att först kontrollera att användaren är ägare eller admin.
Sedan filtreras posten bort från listan och den uppdaterade listan sparas.
Till sist skickas användaren tillbaka till posts‑sidan med en bekräftelse i URL:en.
***
### User och Admin
```js
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
```
isUser: Släpper igenom alla inloggade användare med rollen user eller admin.
isAdmin: Släpper bara igenom användare med rollen admin.
Båda används som middleware för att skydda känsliga routes.
***
### Like
```js
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

    //  Toggle like
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
```
Koden hanterar gilla‑funktionen genom att lägga till eller ta bort användarens e‑post från postens likes‑lista.
Den sparar ändringen, skickar en realtidsuppdatering via Socket.io och redirectar tillbaka till posts‑sidan.
***
### Edit Get
```js
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
```
Koden definierar en route i Express som gör det möjligt att redigera en post. När en användare går till /posts/edit/:id hämtas postens id från URL:en och matchas mot lagrade poster. Om posten inte finns skickas ett felmeddelande tillbaka. Finns den, kontrolleras om den inloggade användaren är ägare till posten eller har rollen admin. Endast dessa får fortsätta, annars skickas användaren tillbaka med ett felmeddelande om nekad åtkomst. Därefter läses en HTML‑mall in från filen editPost.html och placeholders ersätts med postens data innan sidan skickas tillbaka till klienten. Samtidigt loggas information om sessionens användare och postens ägare i konsolen.
***
### Edit Post
```js
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
```
Koden hanterar redigering av en post genom att kontrollera att användaren är ägare eller admin, uppdatera postens beskrivning och eventuellt bild, spara ändringen och sedan redirecta tillbaka till posts‑sidan med information om vilken post som redigerats.
***
### Kommentar Kontroll
```js
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

```
Koden hanterar kommentarsfunktionen genom att kontrollera att posten finns, hämta kommentaren från formuläret och se till att den inte är tom. Därefter läggs kommentaren till i postens lista med text, författare och tid, ändringen sparas och en realtidsuppdatering skickas ut via Socket.io. Slutligen redirectas användaren tillbaka till posts‑sidan.
***
### Ta Bort Kommentar
```js
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
```
Koden hanterar borttagning av en kommentar genom att först kontrollera att posten och kommentaren finns, sedan säkerställa att den som tar bort är antingen kommentarsförfattaren eller admin. Om behörigheten stämmer tas kommentaren bort från listan, ändringen sparas och användaren redirectas tillbaka till posts‑sidan.
***
### Följ
```js
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

    // WebSocket event
    io.emit("followUpdate", {
        username: target,
        followers: user.followers.length
    });

    res.redirect("/profile/" + target);
});
```
Koden hanterar följ‑funktionen genom att ta emot ett användarnamn, kontrollera att både den som följer och den som följs finns, och sedan växla mellan att lägga till eller ta bort relationen i deras respektive listor. Ändringen sparas, ett realtidsmeddelande om antalet följare skickas via Socket.io och användaren redirectas till den följda personens profilsida.
***
### Profil
```js
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

    




    //  Följ-knapp (om det inte är din egen profil)
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

```
Koden hanterar visning av en användares profil genom att hämta alla poster som användaren laddat upp, räkna totala likes och uppladdningar, samt läsa in användarens data från users.json. Om användaren finns byggs en HTML‑sida med profilbild, uppladdningsformulär (för den egna profilen), följ‑knapp (för andra profiler) och en lista över alla poster. Slutresultatet renderas och skickas tillbaka till klienten.
***
### Profilbild
```js
app.post("/profile/upload", profileUpload.single("profileImage"), (req, res) => {
    const users = getUsers();
    const me = users.find(u => u.username === req.session.username);

    if (!me) return res.redirect("/profile/" + req.session.username);

    me.profileImage = req.file.filename; // Spara filnamnet

    saveUsers(users);
    res.redirect("/profile/" + req.session.username);
});
```
Koden hanterar uppladdning av en ny profilbild genom att ta emot filen från formuläret, hitta den inloggade användaren i listan, spara filnamnet som profileImage och uppdatera användardatan. Därefter redirectas användaren tillbaka till sin egen profilsida.
***
### Visar profilsida
```js
 fetch("/session-info")
          .then(res => res.json())
          .then(data => {
      if (data.username) {
          document.getElementById("profileLink").href =
              "/profile/" + encodeURIComponent(data.username);
     }
    });
```
Koden hämtar session‑information från servern via /session-info och om det finns ett användarnamn i svaret uppdateras länken med id profileLink så att den pekar till användarens egen profilsida.
***
### Starta Websockets
```html
<script src="/socket.io/socket.io.js"></script>
<script>
    const socket = io();
</script>

```
Koden laddar in Socket.io‑klienten i webbläsaren och skapar en anslutning till servern genom const socket = io();. Det gör att sidan kan ta emot och skicka realtidsuppdateringar via WebSocket‑kommunikation.
***
### Websockets Uppdatering för Like, Comment och Follow
```html
<script>
socket.on("likeUpdate", data => {
    const btn = document.querySelector(`button[data-post="${data.postId}"]`);
    if (btn) {
        btn.innerHTML = `❤ ${data.likes}`;
    }
});
</script>

<script>
socket.on("newComment", data => {
    const container = document.querySelector(`#comments-${data.postId}`);
    if (container) {
        container.innerHTML += `
            <div class="comment">
                <a href="/profile/${data.author}">${data.author}</a>: ${data.text}
            </div>
        `;
    }
});
</script>

<script>
socket.on("followUpdate", data => {
    const el = document.querySelector(`#followers-${data.username}`);
    if (el) {
        el.textContent = data.followers;
    }
});
</script>
```
Koden lyssnar på tre olika Socket.io‑händelser: **likeUpdate**, **newComment** och **followUpdate**. När en post får nya likes uppdateras knappen med aktuellt antal. När en ny kommentar skickas läggs den direkt till i rätt kommentarscontainer på sidan. Och när någon följer eller slutar följa en användare uppdateras antalet följare i realtid. På så sätt hålls gränssnittet synkroniserat med serverns data utan att sidan behöver laddas om.
***

