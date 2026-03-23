from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

items = []

class Item(BaseModel):
    name:str
    is_done:bool = False

@app.get("/")
def root():
    return {"name": "shika"}


@app.post("/items")
def createitem(item: Item):
    items.append(item)


@app.get("/items")
def showitems():
    return {"items": items}


@app.get("/items/{item_id}")
def get_item(item_id: int) -> Item:
    if item_id < len(items):
        return items[item_id]
    else:
        raise HTTPException(status_code=404, detail="item Not found")
