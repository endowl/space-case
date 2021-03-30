import './App.css';
import { Users, BrowserStorage } from '@spacehq/users'
import {UserStorage} from "@spacehq/storage";
import _ from 'lodash'
import {Fragment, useState} from "react";
import {useEffect} from "react";
import IdentiCat from "./IdentiCat";
import words from 'random-words';

function App() {
  const bucketName = "com.endowl.space-case"
  // TODO: Determine if it makes sense to only keep track of identities OR spaceUsers and derive the other from that?
  const [browserStorage, setBrowserStorage] = useState({})
  const [identities, setIdentities] = useState({})
  const [spaceUsers, setSpaceUsers] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [spaceStorage, setSpaceStorage] = useState({})
  // directoryList is a recursive list of all dirs and files
  const [directoryList, setDirectoryList] = useState({ items: [] })
  const [currentPath, setCurrentPath] = useState("/")
  // fileList contains a list of the files at the currentPath
  const [fileList, setFileList] = useState([])

  // Use first 4 bytes of pubKey to create catId for use with identiCat
  const catIdFromPubKey = (pubKey) => {
    let hexcode = "0x00"
    _.forEach(_.slice(pubKey, 0, 4), (value) => {
      hexcode = hexcode + value.toString(16).padStart(2, '0')
    })
    return hexcode
  }

  const hexFromPubKey = (pubKey) => {
    let hexcode = "0x"
    _.forEach(pubKey, (value) => {
      hexcode = hexcode + value.toString(16).padStart(2, '0')
    })
    return hexcode
  }

  const initializeUsers = async () => {
    console.log("Initializing users from browser storage")
    const browserUserStorage = new BrowserStorage()
    setBrowserStorage(browserUserStorage)
    // console.log("BrowserStorage result: ", storage)

    // error is thrown when identity fails to auth
    const onErrorCallback = (err, identity) => {
      console.log("ERROR: Identity failed to auth using Space SDK: ", err.toString())
    }

    // users are automatically restored from stored identities
    // TODO: Figure out why the correct end point seems to keep changing over time, or is it just inconsistent docs?.....
    // const users = await Users.withStorage(browserUserStorage, {endpoint: "users.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(browserUserStorage, {endpoint: "wss://users.space.storage"}, onErrorCallback)
    // const users = await Users.withStorage(browserUserStorage, {endpoint: "wss://auth-dev.space.storage"}, onErrorCallback)
    const users = await Users.withStorage(browserUserStorage, {endpoint: "wss://auth.space.storage"}, onErrorCallback)
    console.log("Initialized users object using browser storage")
    console.log("users: ", users)
    console.log("users.list(): ", users.list())

    // let userList = await storage.list()
    let userList = users.list()
    console.log("storage.list(): ", await browserUserStorage.list())

    if(_.isEmpty(userList)) {
      console.log("No identities found")
      // TODO: Prompt to restore an identity as alternative to creating a new one?
      const identity = await users.createIdentity()
      console.log("Created identity", identity)
      const newUser = await users.authenticate(identity)
      console.log("Authenticated new user")
    } else {
      console.log("Identities found", userList)
    }

    const browserUserList = await browserUserStorage.list()
    console.log("browserUserList: ", browserUserList)

    setIdentities(browserUserList)
    setSpaceUsers(users)
  }

  const handleNewIdentity = async () => {
    console.log("Request to create a new identity")
    const identity = await spaceUsers.createIdentity()
    console.log("Created new identity")
    const newUser = await spaceUsers.authenticate(identity)
    console.log("Authenticated new user")
    let browserUserList = await browserStorage.list()
    setIdentities(browserUserList)
  }

  const handleSelectIdentity = async (index) => {
    console.log("Request to select identity #", index)
    setCurrentUser(index)
    const userList = spaceUsers.list()
    console.log("userList: ", userList)
    const user = userList[index]
    console.log("user: ", user)
    const userSpaceStorage = new UserStorage(user)
    console.log("userSpaceStorage: ", userSpaceStorage)
    setSpaceStorage(userSpaceStorage)
  }

  const handleOpenFile = async (file) => {
    // read content of an uploaded file
    console.log("Request to open file")
    const fileResponse = await spaceStorage.openFile({ bucket: bucketName, path: file.path});
    const fileContent = await fileResponse.consumeStream();
    console.log("fileContent: ", fileContent)
  }

  const handleSelectPath = async (path) => {
    setCurrentPath(path)
    console.log("path: ", path)
    // readStorage()
    // const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: currentPath, recursive: false })
    const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: '', recursive: true })
    setDirectoryList(ls)
    console.log("ls: ", ls)
  }

  const readStorage = async () => {
    const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: '', recursive: true })
    // const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: currentPath, recursive: false })
    setDirectoryList(ls)
    console.log("ls: ", ls)
    // if(_.isEmpty(currentPath) && !_.isEmpty(ls.items)) {
    //   console.log("currentPath not set, setting it to: ", ls.items[0].path)
    //   setCurrentPath(ls.items[0].path)
    // }
    return ls
  }

  const handleNewDirectory = async () => {
    // let path = ""
    // if(currentPath !== '/') {
    //   path = currentPath + "/"
    // }
    const dirName = words({exactly: 2, join: '-'})
    // console.log("path: ", path)
    console.log("dirName: ", dirName)
    createFolder(dirName)
    // createFolder(path + dirName)
  }

  const createFolder = async (folderName) => {
    console.log("Creating Folder: ", folderName)
    const mkdir = await spaceStorage.createFolder({ bucket: bucketName, path: folderName })
    console.log("mkdir: ", mkdir)
    setCurrentPath("/" + folderName)
    await readStorage()
  }

  useEffect(() => {
    console.log("spaceStorage updated")
    if(!_.isEmpty(spaceStorage)) {
      readStorage().then(ls => {
        // Read spaceStorage from Fleek
        // console.log("ls", ls)
        if(_.isEmpty(ls.items)) {
          console.log("SpaceStorage is empty, creating initial folder")
          // createFolder("My Art")
          handleNewDirectory()
        }
      })
    }
  }, [spaceStorage])

  useEffect(() => {
    initializeUsers()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h2>Space Case</h2>
        {_.isEmpty(identities) && (
            <>
              <p>Checking for saved identities</p>
            </>
        )}
        {!_.isEmpty(identities) && _.isNull(currentUser) && (
            <>
              <div className="identity-selection">
                <h3>My Identities</h3>
                <>
                  {identities.map((id, index) => (
                      <div className={(!_.isNull(currentUser) && currentUser === index) ? "identity-choice current" : "identity-choice"} key={id.pubKey} onClick={() => handleSelectIdentity(index)}>
                        <IdentiCat catId={catIdFromPubKey(id.pubKey)} size="8" />
                        <small>0x{catIdFromPubKey(id.pubKey).substr(4)}...</small>
                      </div>
                  ))}
                  <br />
                  <button className="select" onClick={handleNewIdentity}>
                    + New Identity
                  </button>
                </>
              </div>
            </>
        )}


        {!_.isNull(currentUser) && (
            <div className="my-space">
              <IdentiCat catId={catIdFromPubKey(identities[currentUser].pubKey)} size="8" />
              <small>{hexFromPubKey(identities[currentUser].pubKey)}</small>
              {/*<input readOnly={true} value={hexFromPubKey(identities[currentUser].pubKey)} />*/}

              <div className="">
                {!_.isNull(currentUser) && _.isEmpty(spaceStorage) && (
                    <h3>Loading user data...</h3>
                )}
                {_.isEmpty(directoryList.items) && (
                    <h3>Initializing storage bucket...</h3>
                )}
                {!_.isEmpty(directoryList.items) && (
                    <>
                      <h3>My Files:</h3>
                      <button onClick={handleNewDirectory}>+ Dir</button>
                      <button>Upload</button>
                      <div>
                        Path: {currentPath}
                      </div>
                      <div className="file-directory">
                        <div className="directories">
                          <ul>
                            <li className={('/' === currentPath) ? "current" : ""} onClick={() => handleSelectPath('/')}>
                              /
                            </li>
                            {directoryList.items.map((item, index) => {
                              return (
                                  <Fragment key={item.path}>
                                    {item.isDir && (
                                      <li className={(item.path === currentPath) ? "current" : ""} onClick={() => handleSelectPath(item.path)}>
                                        {item.name}
                                      </li>
                                    )}
                                  </Fragment>
                              )
                            })}
                          </ul>
                        </div>
                        <div className="files">
                          <ul>
                            {directoryList.items.map((item, index) => {
                              <Fragment key={item.path}>
                                {currentPath === item.path && !item.isDir && (
                                    <li className={(item.path === currentPath) ? "current" : ""}>
                                      {item.name}
                                    </li>
                                )}
                                {currentPath == item.path && item.isDir && (
                                    <>
                                      {item.items.map((file, fileIndex) => {
                                        return (
                                            <li key={file.path} onClick={() => {
                                              if(file.isDir) {
                                                handleSelectPath(file.path)
                                              }
                                              else {
                                                handleOpenFile(file)
                                              }
                                            }}>
                                              {file.name}
                                            </li>
                                        )
                                      })}
                                    </>
                                )}
                              </Fragment>
                            })}

                            {/*
                            {directoryList.items.map((item, index) => {
                              if(item.isDir) {
                                return <></>
                              }
                              return (
                                  <Fragment key={item.path}>
                                    {!item.isDir && (
                                      <li className={(item.path === currentPath) ? "current" : ""}>
                                        {item.name}
                                      </li>
                                    )}
                                    {item.items.map((file, fileIndex) => {
                                      return (
                                          <li key={file.path} onClick={() => {
                                            if(file.isDir) {
                                              handleSelectPath(file.path)
                                            }
                                            else {
                                              handleOpenFile(file)
                                            }
                                          }}>
                                            {file.name}
                                          </li>
                                      )
                                    })}
                                  </Fragment>
                              )
                            })}
                            */}
                          </ul>
                        </div>
                      </div>
                    </>
                )}

              </div>

            </div>
        )}


      </header>
    </div>
  );
}

export default App;
