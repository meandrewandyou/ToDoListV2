
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Создаем БД, схему для элементов, создаем дефолтные элементы
// Creating bd, schema, collection and default items
mongoose.connect("mongodb://localhost:27017/todolistDB", { useNewUrlParser: true, useUnifiedTopology: true });
const itemsSchema = {
  name: String
};
const Goal = mongoose.model("Goal", itemsSchema);

const item1 = new Goal({
  name: "Weclome to your ToDo List!"
});

const item2 = new Goal({
  name: "Hit + button to add new goal."
});

const item3 = new Goal({
  name: "<<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

// Создаем схему и отдельную коллекцию для элементов генерируемых страниц
// Creating schema and collections for generated lists

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


// Домашняя страница.При первом переходе дефолтные элементы сохраняются в БД, и сразу отображаются
// Default home page. On first visit default elements added to the collection
app.get("/",function(req,res){
  Goal.find(function(err,goals){
    if(goals.length === 0){
      Goal.insertMany(defaultItems, function(err, results){
        if (err){
          console.log(err);
        }else{
          console.log("Items added to todolistDB");
res.redirect("/");
      }});

    }else{
      res.render("list", {listTitle: "Today", newListItems: goals});
    }
  })
});

// Генерируемые страницы, с помощью которых пользователь может создавать несколько списков. Например рабочий, дела по дому и т.д.
// Generated pages for different ToDo lists

app.get("/:listName", function(req,res){
  const newRoute = _.capitalize(req.params.listName);

  // В коллеции "lists" при переходе на кастомный лист создается еще один лист favicon. Вроде бы это прикол хрома. Строчка ниже не даст ее создать
  // For some reason routing to custom list creates new favicon list in "lists" collection. Seems like only in Chrome. String below fixes it
if (newRoute === "Favicon.ico") return;

List.findOne({name:newRoute}, function(err,results){
if(!err){
// Просто рендерим страницу "О", если пользователь переходит на нее
// Just "about" page, nothing special
if(newRoute === "About"){
  res.render("about");
}
// Проверяем, если нового листа еще не существует, добавляем в него дефолтные элементы, сохраняем, и перенаправляем на эту же,но уже заполненную страницу
// Check if list exists or not, adding default items in it, saving it, redirecting to the same page but with db data inserted.
  else if(!results){
    const list = new List({
      name: newRoute,
      items: defaultItems
    });

    list.save(function(){
        res.redirect("/" + newRoute);
    });

  }else{
    // Если лист в БД уже есть, то рендерим страницу с его данными
    // If list already exists, we just render the page
    res.render("list",{
      listTitle: results.name,
      newListItems: results.items
    });
  }
}
});


});

// Добавляем новые записи в лист
// Adding new items to lists
app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

const newGoalName = new Goal({
  name: itemName
});

// Добавляем запись на дефолтный лист
// Into default list

if (listName === "Today"){
  newGoalName.save();
  res.redirect("/");
}else{

  // Добавляем запись в любой кастомный лист
  // Into any custom created list

  List.findOne({name:listName}, function(err, foundList){
    foundList.items.push(newGoalName);
    foundList.save(function(){
      res.redirect("/" + listName);
    })
  })
}


});

// Удаляем записи из листа
// Removing items from the list

app.post("/delete", function(req,res){
const checkedGoal =  req.body.checkbox;
const listName = req.body.listName;

// Удаляем с дефолтного листа
// From default list

if(listName === "Today"){
  Goal.findByIdAndRemove(checkedGoal,{useFindAndModify: false}, function(err){
    if(err){
      console.log(err);
    }else{
      console.log("Item deleted");
      res.redirect("/");
    }
  });
}else

// Удаляем с кастомного листа
// From custom list

List.findOneAndUpdate({name: listName},{$pull:{items: {_id:checkedGoal}}},{useFindAndModify: false},function(err, foundList){
  if(!err){
    res.redirect("/" + listName);
  }
})

});






app.listen(3000, function() {
  console.log("Server started on port 3000");
});
