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
### Rubrik till koden
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
```
Koden hanterar gilla‑funktionen genom att lägga till eller ta bort användarens e‑post från postens likes‑lista.
Den sparar ändringen, skickar en realtidsuppdatering via Socket.io och redirectar tillbaka till posts‑sidan.
***
### Rubrik till koden
```js


```
Här skriver jag förklaring till koden ovanför
***
### Rubrik till koden
```js


```
Här skriver jag förklaring till koden ovanför
***
### Rubrik till koden
```js


```
Här skriver jag förklaring till koden ovanför
***

