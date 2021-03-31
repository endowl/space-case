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
  const [currentPath, setCurrentPath] = useState("/")
  // directoryList is a list of all dirs at the top level
  const [directoryList, setDirectoryList] = useState([])
  // fileList contains a list of the files at the currentPath
  const [fileList, setFileList] = useState([])
  const [currentFile, setCurrentFile] = useState("")
  const [inputFile, setInputFile] = useState()
  const [contactLabel, setContactLabel] = useState("")
  const [contactAddress, setContactAddress] = useState("")
  const [contacts, setContacts] = useState([])
  const [selectedContacts, setSelectedContacts] = useState([])
  const [receivedFiles, setReceivedFiles] = useState({files: []})

  // Use first 4 bytes of pubKey to create catId for use with identiCat
  const catIdFromPubKey = (pubKey) => {
    let hexcode = "0x00"
    _.forEach(_.slice(pubKey, 0, 4), (value) => {
      hexcode = hexcode + value.toString(16).padStart(2, '0')
    })
    return hexcode
  }

  const catIdFromAddress = (address) => {
    let hexcode = "0x00" + address.substr(2,10)
    console.log("hexcode", hexcode)
    return hexcode
  }

  const hexFromPubKey = (pubKey) => {
    let hexcode = "0x"
    _.forEach(pubKey, (value) => {
      hexcode = hexcode + value.toString(16).padStart(2, '0')
    })
    return hexcode
  }

  const pubKeyFromHex = (hex) => {
    console.log("pubKeyFromHex: ", hex)
    let pubKey = []
    // Skip over '0x' and then turn each to hex characters into an integer and push it to pubKey
    for(let i=2; i < hex.length; i+=2) {
      pubKey.push(parseInt(hex.substr(i, 2), 16))
    }
    console.log("pubKey: ", pubKey)
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

  const handleSelectFile = async (file) => {
    console.log("Request to select file")
    setCurrentFile(file.path)
  }

  const handleOpenFile = async () => {
    // Read content of a file from Fleek bucket
    console.log("Request to open file")
    const file = currentFile
    console.log("file: ", file)
    const fileResponse = await spaceStorage.openFile({ bucket: bucketName, path: file});
    const fileContent = await fileResponse.consumeStream();
    console.log("fileContent: ", fileContent)
  }

  const handleSelectPath = async (path) => {
    console.log("Request to select path: ", path)
    setCurrentFile("")
    setCurrentPath(path)

    // get listing of files from Fleek at requested path
    const files = await spaceStorage.listDirectory({bucket: bucketName, path: path, recursive: false })
    setFileList(files.items)
    console.log("files.items: ", files.items)

    // update root directory list, but only call Fleek again if we need to
    if(path === '' || path === '/') {
      // selected path is already the root directory, copy  directory listing from file listing
      let directories = []
      files.items.map(file => {
        if(file.isDir) {
          directories.push(file)
        }
      })
      console.log("parsed directories: ", directories)
      setDirectoryList(directories)
    } else {
      // selected path is a subdirectory, refresh root directory listing
      const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: '', recursive: false })
      setDirectoryList(directoriesFromSpace(ls))
    }

    // Refresh shared files while we're at it
    getFilesSharedWithMe()
  }


  const getFilesSharedWithMe = async() => {
    const result = await spaceStorage.getFilesSharedWithMe()
    console.log("getFilesSharedWithMe result: ", result)
    setReceivedFiles(result)
  }

  // Refresh root directory listing
  const reloadRootDirectory = async () => {
    const ls = await spaceStorage.listDirectory({ bucket: bucketName, path: '', recursive: false })
    setDirectoryList(directoriesFromSpace(ls))
    console.log("ls: ", ls)

    getFilesSharedWithMe()

    return ls
  }

  // Take result of spaceStorage.listDirectory and return array of the top level directories
  const directoriesFromSpace = (listDirectoryResult) => {
    let directories = []
    listDirectoryResult.items.map(file => {
      if(file.isDir) {
        directories.push(file)
      }
    })
    return directories
  }

  const handleNewDirectory = async () => {
    const dirName = words({exactly: 2, join: '-'})
    console.log("dirName: ", dirName)
    createFolder(dirName)
  }

  const createFolder = async (folderName) => {
    console.log("Creating Folder: ", folderName)
    const mkdir = await spaceStorage.createFolder({ bucket: bucketName, path: folderName })
    console.log("mkdir: ", mkdir)
    setCurrentPath("/" + folderName)
    await reloadRootDirectory()
  }

  /*
  const handleFileChange = async (event) => {
    console.log("Input file changed");
    // console.log("event", event);
    const file = event.target.files[0];
    console.log("event.target.files[0]", file);
    setInputFile(file);
  }
  */

  const handleShareFile = async () => {
    console.log("Request to share file")
    if(_.isEmpty(currentFile)) {
      console.log("ERROR: No file selected")
      return
    }
    if(_.isEmpty(selectedContacts)) {
      console.log("ERROR: No contacts selected")
      return
    }

    let publicKeys = []
    selectedContacts.map(index => {
      publicKeys.push({
        // id: contacts[index].label,
        pk: pubKeyFromHex(contacts[index].address)
      })
    })

    const shareResult = await spaceStorage.shareViaPublicKey({
      publicKeys: publicKeys,
      paths: [{
        bucket: bucketName,
        path: currentFile,
      }]
    })

    console.log("shareResult:", shareResult)

    // TODO: Figure out how to get shared file to show up for recipient!!!!

    // you can share privately with existing users via their public key:
    /*
    await spaceStorage.shareViaPublicKey({
      publicKeys: [{
        id: 'user@email.com', // or any identifier for the user
        pk: 'user-pk-hex-or-multibase', // optional, omit if user doesn't exist yet, it would generate temp access key
      }],
      paths: [{
        bucket: 'personal',
        path: '/file/path/here'
      }],
    });
     */
  }

  const handleFileUpload = async (event) => {
    // upload a file
    const file = event.target.files[0];
    console.log("event.target.files[0]", file);
    setInputFile(file);

    if(_.isNull(file)) {
      console.log("ALERT: file is null")
      return
    }
    let path = currentPath
    if(path === '' || path.substr(path.length-1) !== '/') {
      path = path + '/'
    }
    // NOTE: OMFG, Fleeks docs say to use "content" but it needs to be called "data"!!!!!
    const uploadResponse = await spaceStorage.addItems({
      bucket: bucketName,
      files: [
        {
          // path: path + 'file.txt',
          path: path + file.name,
          // path: 'file.txt',
          // content: file,
          // data: "This is only a test"
          data: file,
          mimeType: file.type
        }      ],
    });
    uploadResponse.once('done', (data) => {
      // returns a summary of all files and their upload status
      console.log("uploadResponse summary: ", data)
      // TODO: break this out a little more semantically, the intent being to refresh the file list
      handleSelectPath(currentPath)
    })

    /*
    console.log("Uploading file to Textile");
    const path = "test_path";
    const result = await storage.insertFile(buckets, bucketKey, selectedFile, path);
    console.log("Done uploading file to Textile")
    console.log("result", result);

    // TODO: Move this
    // Read back test file from the Bucket
    console.log("Reading test file from Textile Bucket");
    // TODO: Create link to download/view the retrieved file
    try {
      const data = buckets.pullPath(bucketKey, path)
      const { value } = await data.next();
      console.log("data value", value)
      let str = "";
      for (let i = 0; i < value.length; i++) {
        str += String.fromCharCode(parseInt(value[i]));
      }
      console.log("str", str);

    } catch (error) {
      console.log("Error while loading file from bucket", error)
    }
    */
  }

  const handleAddContact = () => {
    // Update local copy of contact list
    let tmpContacts = _.clone(contacts)
    const newContact = {
      label: contactLabel,
      address: contactAddress,
    }
    console.log("newContact: ", newContact)
    tmpContacts.push(newContact)
    setContacts(tmpContacts)
    setContactLabel("")
    setContactAddress("")

    // TODO: Update contacts file on Fleek
  }

  const handleToggleContactSelection = (index) => {
    console.log("Request to toggle selection of contact: ", index)
    const foundSelectedContact = _.indexOf(selectedContacts, index)
    const selectedContactsCopy = _.clone(selectedContacts)
    // Check if the given contact is in the current list of selected contacts
    console.log("selectedContacts: ", selectedContacts)
    if(foundSelectedContact === -1) {
      console.log("Contact not already selected, adding them")
      // Contact was not already selected, add them to selectedContacts
      selectedContactsCopy.push(index)
      console.log("selectedContactsCopy: ", selectedContactsCopy)
      setSelectedContacts(selectedContactsCopy)
    } else {
      console.log("Contact was already selected, removing them")
      // Remove contact from selectedContacts
      _.pull(selectedContactsCopy, index)
      console.log("selectedContactsCopy: ", selectedContactsCopy)
      setSelectedContacts(selectedContactsCopy)
    }
  }


  // TODO: Load contacts file from Fleek



  useEffect(() => {
    console.log("spaceStorage updated")
    if(!_.isEmpty(spaceStorage)) {
      reloadRootDirectory().then(ls => {
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
              <IdentiCat catId={catIdFromPubKey(identities[currentUser].pubKey)} size="4" />
              <small>{hexFromPubKey(identities[currentUser].pubKey)}</small>
              {/*<input readOnly={true} value={hexFromPubKey(identities[currentUser].pubKey)} />*/}

              <div className="">
                {!_.isNull(currentUser) && _.isEmpty(spaceStorage) && (
                    <h3>Loading user data...</h3>
                )}
                {_.isEmpty(directoryList) && (
                    <h3>Initializing storage bucket...</h3>
                )}
                {(!_.isEmpty(fileList) || !_.isEmpty(directoryList)) && (
                    <>
                      <h3>My Files:</h3>
                      <button onClick={handleNewDirectory}>
                        + Mkdir
                      </button>
                      <label className="file-upload">
                        <input type="file" onChange={handleFileUpload} />
                        ^ Upload
                      </label>
                      {/*<button onClick={handleFileUpload}>^ Upload</button>*/}
                      <button onClick={handleOpenFile} disabled={_.isEmpty(currentFile)}>
                        [] Open File
                      </button>
                      <button onClick={handleShareFile} disabled={_.isEmpty(currentFile) || _.isEmpty(selectedContacts)}>
                        &amp; Share
                      </button>
                      <div>
                        Path: {currentPath}
                      </div>
                      <div className="file-directory">
                        <div className="directories">
                          <ul>
                            <li className={('/' === currentPath) ? "current" : ""} onClick={() => handleSelectPath('/')}>
                              /
                            </li>
                            {directoryList.map((directory, index) => {
                              return (
                                  <Fragment key={directory.path}>
                                    {directory.isDir && (
                                      <li className={(directory.path === currentPath) ? "current" : ""} onClick={() => handleSelectPath(directory.path)}>
                                        {directory.name}
                                      </li>
                                    )}
                                  </Fragment>
                              )
                            })}
                          </ul>
                        </div>
                        <div className="files">
                          <ul>
                            {fileList.map((file, index) => {
                              return (
                                <Fragment key={file.path}>
                                  {!file.isDir && (
                                    <li className={(file.path === currentFile) ? "current" : ""} onClick={() => handleSelectFile(file)}>
                                      {file.name}
                                    </li>
                                  )}
                                </Fragment>
                                )
                            })}
                          </ul>
                        </div>
                      </div>

                      <h3>My Contacts:</h3>
                      <input placeholder="label" value={contactLabel} onChange={e => setContactLabel(e.target.value)} />
                      <input placeholder="address" value={contactAddress} onChange={e => setContactAddress(e.target.value)} />
                      <button onClick={handleAddContact}>
                        + Add
                      </button>
                      <br />
                      {contacts.map((contact, i) => {
                        return (
                            <div className={(_.indexOf(selectedContacts, i) !== -1) ? "identity-choice current" : "identity-choice"} key={i} onClick={() => handleToggleContactSelection(i)}>
                              <IdentiCat catId={catIdFromAddress(contact.address)} size="4" />
                              <small title={contact.address}>{contact.label}</small>
                            </div>
                        )
                      })}

                      {!_.isEmpty(receivedFiles.files) && (
                          <>
                            <h3>Received Files:</h3>
                            TODO: Display received files here...
                          </>
                      )}

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
