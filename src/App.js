// import logo from './logo.svg';
import './App.css';
import { Users, BrowserStorage } from '@spacehq/users'
import _ from 'lodash'
import mooncatparser from './mooncatparser'
import {useState} from "react";
import {useEffect} from "react";

function generateMoonCatImage(catId, size){
  size = size || 10;
  var data = mooncatparser(catId);
  var canvas = document.createElement("canvas");
  canvas.width = size * data.length;
  canvas.height = size * data[1].length;
  var ctx = canvas.getContext("2d");

  for(var i = 0; i < data.length; i++){
    for(var j = 0; j < data[i].length; j++){
      var color = data[i][j];
      if(color){
        ctx.fillStyle = color;
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }
  return canvas.toDataURL();
}

function App() {
  const [identities, setIdentities] = useState({})

  async function initializeUsers() {
    // TODO: Move this code block to an appropriate spot
    console.log("Initializing users from browser storage")
    const storage = new BrowserStorage()
    // error is thrown when identity fails to auth
    const onErrorCallback = (err, identity) => {
      console.log("ERROR: Identity failed to auth using Space SDK: ", err.toString())
    };

    // users are automatically restored from stored identities
    // const users = await Users.withStorage(storage, {endpoint: "users.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(storage, {endpoint: "wss://users.space.storage"}, onErrorCallback)
    const users = await Users.withStorage(storage, {endpoint: "wss://auth-dev.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(storage, {endpoint: "wss://auth.space.storage"}, onErrorCallback)
    console.log("Initialized users object using browser storage")
    console.log("users: ", users)

    let userList = await storage.list()
    console.log("storage.list(): ", userList)

    if(_.isEmpty(userList)) {
      console.log("No identities found")
      // TODO: Prompt to restore an identity as alternative to creating a new one
      const identity = await users.createIdentity()
      console.log("Created identity", identity)
    } else {
      console.log("Identities found", userList)
    }

    userList = await storage.list()

    // set moon cat id on each identity
    _.forEach(userList, (id) => {
      let hexcode = "0x00"
      _.forEach(_.slice(id.pubKey, 0, 4), (value) => {
        // console.log(value.toString(16))
        hexcode = hexcode + value.toString(16)
      })
      console.log(hexcode)
      id.catId = hexcode
    })

    console.log("userList: ", userList)

    setIdentities(userList)
  }

  useEffect(() => {
    initializeUsers()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        {/*<img src={logo} className="App-logo" alt="logo" />*/}
        {_.isEmpty(identities) && (
            <>
              <p>Checking for saved identity</p>
            </>
        )}
        {!_.isEmpty(identities) && (
            <>
              <p>Identity loaded</p>
              <>
                {identities.map(id => (
                    <>
                      <img src={generateMoonCatImage(id.catId, 8)} className="App-logo" alt="identicat" />
                      <small>0x{id.catId.substr(4)}...</small>
                    </>
                ))}
              </>
            </>
        )}
      </header>
    </div>
  );
}

export default App;
