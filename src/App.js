import './App.css';
import { Users, BrowserStorage } from '@spacehq/users'
import _ from 'lodash'
import {Fragment, useState} from "react";
import {useEffect} from "react";
import IdentiCat from "./IdentiCat";

function App() {
  // TODO: Determine if it makes sense to only keep track of identities OR spaceUsers and derive the other from that?
  const [browserStorage, setBrowserStorage] = useState({})
  const [identities, setIdentities] = useState({})
  const [spaceUsers, setSpaceUsers] = useState({})
  const [currentUser, setCurrentUser] = useState(null)

  // Use first 4 bytes of pubKey to create catId
  const catIdFromPubKey = (pubKey) => {
    let hexcode = "0x00"
    _.forEach(_.slice(pubKey, 0, 4), (value) => {
      hexcode = hexcode + value.toString(16).padStart(2, '0')
    })
    console.log("hexcode", hexcode)
    return hexcode
  }

  const initializeUsers = async () => {
    console.log("Initializing users from browser storage")
    const storage = new BrowserStorage()
    setBrowserStorage(storage)
    // error is thrown when identity fails to auth
    const onErrorCallback = (err, identity) => {
      console.log("ERROR: Identity failed to auth using Space SDK: ", err.toString())
    }

    // users are automatically restored from stored identities
    // const users = await Users.withStorage(storage, {endpoint: "users.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(storage, {endpoint: "wss://users.space.storage"}, onErrorCallback)
    const users = await Users.withStorage(storage, {endpoint: "wss://auth-dev.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(storage, {endpoint: "wss://auth.space.storage"}, onErrorCallback)
    console.log("Initialized users object using browser storage")
    console.log("users: ", users)
    console.log("users.list(): ", users.list())

    // let userList = await storage.list()
    let userList = users.list()
    console.log("storage.list(): ", userList)

    if(_.isEmpty(userList)) {
      console.log("No identities found")
      // TODO: Prompt to restore an identity as alternative to creating a new one?
      const identity = await users.createIdentity()
      console.log("Created identity", identity)
    } else {
      console.log("Identities found", userList)
    }

    userList = await storage.list()
    console.log("userList: ", userList)

    setIdentities(userList)
    setSpaceUsers(users)
  }

  const handleNewIdentity = async () => {
    console.log("Request to create a new identity")
    await spaceUsers.createIdentity()
    let userList = await browserStorage.list()
    setIdentities(userList)
  }

  const handleSelectIdentity = (index) => {
    console.log("Request to select identity")
    setCurrentUser(index)
  }

  // let catId

  useEffect(() => {
    initializeUsers()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        {_.isEmpty(identities) && (
            <>
              <p>Checking for saved identities</p>
            </>
        )}
        {!_.isEmpty(identities) && (
            <>
              <p>My Identities</p>
              <>
                {identities.map((id, index) => (
                    <div className={(!_.isNull(currentUser) && currentUser === index) ? "identity-choice current" : "identity-choice"} key={id.pubKey} onClick={() => handleSelectIdentity(index)}>
                      {/*{id.toString().substr(7, 16)}...*/}
                      <IdentiCat catId={catIdFromPubKey(id.pubKey)} size="8" />
                      <small>0x{catIdFromPubKey(id.pubKey).substr(4)}...</small>
                    </div>
                ))}
                <button className="select" onClick={handleNewIdentity}>
                  + New Identity
                </button>
              </>
            </>
        )}
      </header>
    </div>
  );
}

export default App;
