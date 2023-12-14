import { useState, useContext, useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import { setContent, setFileName } from "../../reducers/editorReducer";
import { LanguageContext } from "../../contexts/languagecontext";
import commService from '../../services/comms'
import AdminViewUserListSection from './adminViewUserListSection';
import AdminViewUserFilesSection from './adminViewUserFilesSection';
import AdminViewAllFilesSection from './adminViewAllFilesSection';
import AdminViewEditorSection from './adminViewEditorSection';
import '../../css/adminView.css';
import { togglePassRequired } from "../../reducers/commsReducer";

/**
 * `AdminView` component serves as the main interface for the administration dashboard.
 * It includes functionalities such as user and file management, file editing, and system settings.
 * The component integrates with Redux for state management and communicates with backend services for data handling.
 *
 * @component
 * @example
 * return <AdminView />
 */

const AdminView = () => {
    const dispatch = useDispatch()
    const { translations } = useContext(LanguageContext)
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [allFiles, setAllFiles] = useState([]);
    const [userFiles, setUserFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState('files');
    const [openedFile, setOpenedFile] = useState({
        'filename' : '',
        'id': '',
        'user_id': '',
        'user': ''
    })
    const textContent = useSelector(state => state.editor.fileObject.textContent)
    const passwordIsRequired = useSelector(state => state.comms.passReq);
    const token = useSelector(state => state.comms.userObject.token)
    const [isUploadOpen, setisUploadOpen] = useState(false)
    const [isPasswordWindowOpen, setIsPasswordWindowOpen] = useState(false)
    const [sortedOrder, setSortedOrder] = useState({
        'key' : 'filename',
        'order' : true
    })

    useEffect( () => {
        getData()
    }, []);

    const getData = async () => {
        const files = await commService.getAllFiles(token)
        const users = await commService.getAllUsers(token)
        sortFiles(files, sortedOrder.key, sortedOrder.order)
        setUsers(users);
        if (selectedUser) {
            const filesForUser = files.filter(file => file.user_id === selectedUser.id)
            setUserFiles(filesForUser);
        }
    }

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const filteredUsers = searchQuery.length === 0
        ? users
        : users.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Handles user selection and updates UI to show selected user's files
    const handleUserClick = (user) => {
        setSelectedUser(user);
        setViewMode('files');
        const filesForUser = allFiles.filter(file => file.user_id === user.id)
        setUserFiles(filesForUser);
    };

    const handleFileClick = (file) => {
        const username = users.find(user => user.id === file.user_id).name
        dispatch(setContent(file.textContent))
        dispatch(setFileName(file.filename))
        setOpenedFile(openedFile => ({
            ...openedFile,
            filename:  file.filename,
            id: file.id,
            user_id: file.user_id,
            user: username
        }));
    };

    const handleDownloadClick = (file) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent));
        element.setAttribute('download', file.filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    const handleModifyClick = async (file) => {
        const res = await commService.adminSaveFile(file.filename, textContent, file.user_id, token)
        const formattedMessage = res !== 'FAIL'
            ? translations?.adminView.saveConfirmedMessage.replace('{filename}', file.filename)
            : translations?.adminView.saveFailureMessage.replace('{filename}', file.filename)

        alert(formattedMessage)
        getData()
    }

    const handleDeleteClick = async (file) => {
        const formattedMessage = translations?.editorNavbar.confirmDeleteMessage.replace(
            '{filename}', file.filename);

        const isConfirmed = window.confirm(formattedMessage)

        if (isConfirmed) {
            const res = await commService.deleteFile(file.id, token)
            const resultMessage = res !== 'FAIL'
                ? translations?.adminView.deleteSuccesful.replace('{filename}', file.filename)
                : translations?.adminView.deleteFailed.replace('{filename}', file.filename)
            getData()
            alert(resultMessage)
        }
    }

    const handlePasswordChange = async (event) => {
        event.preventDefault()
        const password = document.getElementById('passwordInput').value;
        const res = await commService.changePassword(selectedUser.id, password, token)
        if (res === 'FAIL') {
            alert(translations?.adminView.passwordChangeFailed)
        }
        setIsPasswordWindowOpen(false)
        getData()
    }

    const handleVisibleClick = async (file) => {
        await commService.hideFile(file.id, token)
        getData()
    }

    const handleNewFileClick = () => {
        dispatch(setContent(""))
        dispatch(setFileName(null))
        setTimeout(() => dispatch(setFileName('')), 1)
        setOpenedFile(openedFile => ({
            ...openedFile,
            filename:  "",
            id: "",
            user_id: "",
            user: ""
        }));
    }

    const handleSendToRobotClick = async ()  => {
        const res = await commService.deployToRobot(textContent, token)
        const alertMessage = res !== 'FAIL'
            ? translations?.adminView.deployToRobotSuccesful
            : translations?.adminView.deployToRobotFailed
        alert(alertMessage)
    }

    const handleSortClick = (files, key) => {
        setSortedOrder(sortedOrder => ({
            ...sortedOrder,
            key : key,
            order : !sortedOrder.order
        }))
        sortFiles(files,key, !sortedOrder.order)
    }

    const sortFiles = (files, key, order) => {
        const sortOrder = order ? 'asc' : 'desc';        
        const sorted = Object.entries(files).sort(([,a],[,b]) =>{
            let aValue, bValue;
            if (key === 'last_updated'){
                aValue = new Date(a[key])
                bValue = new Date(b[key])
            } else {
                aValue = a[key].toLowerCase()
                bValue = b[key].toLowerCase()
            }
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1
            }
        })
        const sortedArray = sorted.map(([key, value]) => ({ key, ...value }));
        setAllFiles(sortedArray)
    }

    useEffect(() => {
        if (selectedUser) {
            handleUserClick(selectedUser)
        }
    }, [allFiles])

    return (
        <div className="admin-container">

            <div className='toggle-password-section'>
                <h1 tabIndex="0">{translations?.adminView.adminDashboard}</h1>
                <p tabIndex="0">{passwordIsRequired ? translations.navbar.passwordLoginOn : translations.navbar.passwordLoginOff }</p>
                <button onClick={() => dispatch(togglePassRequired(token))} className='button' id='password-requirement-button'>
                    {passwordIsRequired ? translations.navbar.on : translations.navbar.off}
                </button>
            </div>

            <div className="sections-container">
                {/* User list section */}
                <AdminViewUserListSection
                    searchQuery={searchQuery} handleSearchChange={handleSearchChange} filteredUsers={filteredUsers}
                    handleUserClick={handleUserClick} setSelectedUser={setSelectedUser} setViewMode={setViewMode}
                />

                {/* Selected user's files section */}
                {selectedUser && (
                    <AdminViewUserFilesSection
                        viewMode={viewMode} selectedUser={selectedUser} setSelectedUser={setSelectedUser}
                        isPasswordWindowOpen={isPasswordWindowOpen} setIsPasswordWindowOpen={setIsPasswordWindowOpen}
                        userFiles={userFiles} allFiles={allFiles} users={users} handlePasswordChange={handlePasswordChange}
                        handleFileClick={handleFileClick} handleVisibleClick={handleVisibleClick} handleDeleteClick={handleDeleteClick} handleDownloadClick={handleDownloadClick}
                        handleSortClick={handleSortClick} sortedOrder={sortedOrder}
                    />
                )}

                {/* All files section */}
                <AdminViewAllFilesSection
                    allFiles={allFiles} users={users} setOpenedFile={setOpenedFile}
                    handleFileClick={handleFileClick} handleVisibleClick={handleVisibleClick}
                    handleDeleteClick={handleDeleteClick} handleDownloadClick={handleDownloadClick}
                    handleSortClick={handleSortClick} sortedOrder={sortedOrder}
                />
            </div>

            {/* Editor section to display the selected file */}
            <AdminViewEditorSection
                handleNewFileClick={handleNewFileClick} isUploadOpen={isUploadOpen} setisUploadOpen={setisUploadOpen}
                filteredUsers={filteredUsers} users={users} openedFile={openedFile} setOpenedFile={setOpenedFile}
                handleDownloadClick={handleDownloadClick} handleModifyClick={handleModifyClick} handleDeleteClick={handleDeleteClick}
                handleSendToRobotClick={handleSendToRobotClick} textContent={textContent} />
        </div>
    );
};

export default AdminView;