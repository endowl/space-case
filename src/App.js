import logo from './logo.svg';
import './App.css';
import { Users, BrowserStorage } from '@spacehq/users'
import _ from 'lodash'

async function initializeUsers() {
  // TODO: Move this code block to an appropriate spot
  console.log("Initializing users from browser storage")
  const storage = new BrowserStorage()
  // error is thrown when identity fails to auth
  const onErrorCallback = (err, identity) => {
    console.log("ERROR: Identity failed to auth using Space SDK: ", err.toString())
  };

  // users are automatically restored from stored identities
  const users = await Users.withStorage(storage, {endpoint: "users.space.storage"}, onErrorCallback)
  console.log("Initialized users object using browser storage")
  console.log("users: ", users)

  const userList = await storage.list()
  console.log("storage.list(): ", userList)

  let identity

  if(_.isEmpty(userList)) {
    console.log("No identities found")
    // TODO: Prompt to restore an identity as alternative to creating a new one
    identity = await users.createIdentity()
    console.log("Created identity", identity)
    // storage.add(identity)
  } else {
    console.log("Identity found")
    identity = userList[0]
  }
  console.log("Identity: ", identity)

}
initializeUsers()

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
