from typing import Union
import bcrypt
import credentials


class UserService:
    '''
    Class for handling user related operations.

    attr:
        db (obj): an object for handling communications with the database
        secret (str): the secret key for creating session tokens and other cookies
    '''

    def __init__(self, database: object, secret: str):
        self.database = database
        self.secret_key = secret

    def register(self, username: str, password: str) -> bool:
        '''
        Method which handles user registration. Fails if username not unique.

        args:
            username (str)
            password (str)
        returns:
            bool: True if registration succesful False otherwise
        '''
        pass_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pass_bytes, salt)
        query = 'INSERT INTO users (name, password) VALUES (?,?)'
        values = (username, hashed)
        result = self.database.insert_entry(query, values)
        if result == "OK":
            return True

        return False

    def login(self, username: str, password: str) -> Union[dict, bool]:
        '''
        Method which verifies given username and password with database user contents.
        Forms a cookie token for later user verification if credentials match with database contents

        args:
            username (str)
            password (str)
        returns:
            token (dict): returns a decoded token if user verification is succesful
            bool: False otherwise
        '''
        result = self.check_credentials(username, password)

        if result:
            token = credentials.get_token(
                username, result["id"], self.secret_key)
            return {"token": token, "role": result["role"]}

        return False

    def login_without_pass(self, username: str):
        result = self.check_username(username)

        if result:
            token = credentials.get_token(
                username, result["id"], self.secret_key)
            return {"token": token, "role": result["role"]}

        return False

    def verify_token(self, token: str) -> Union[int, bool]:
        '''
        Method which verifies an user-given token's legitimacy

        args:
            token (str): user-given token
        returns:
            user_id (int): user's personal id if succesful
            bool: False otherwise 
        '''
        result = credentials.decode_token(token, self.secret_key)

        if result:
            return result.get('user_id')

        return result

    def verify_user_existence(self, user_id: int, username: str) -> bool:
        """
        Checks if user for given user id or username exists in database
        Pass either of values, not both. Ie:
            result = verify_user_existence(0, username)
        or:
            result = verify_user_existence(id, None)

        args:
            id (int)
            username (str)
        returns:
            bool: True if found, False otherwise
        """
        query = "SELECT * FROM users WHERE id = ?"
        if username:
            query = "SELECT * FROM users WHERE name = ?"
        result = self.database.get_entry_from_db(
            query, (username,) if username else (user_id,))

        if result:
            return True
        return False

    def check_credentials(self, username: str, password: str) -> Union[int, bool]:
        '''
        Method which compares user given credentials with existing credentials in database

        args:
            username (str)
            password (str)
        returns:
            user_id (int): user's personal id if succesful
            bool: False otherwise
        '''
        db_entry = self.database.get_entry_from_db(
            "SELECT name, password, id, role FROM users WHERE name = ?", (username,))
        if not db_entry:
            return False
        hashed = db_entry[1]
        pass_bytes = password.encode("utf-8")
        result = bcrypt.checkpw(pass_bytes, hashed)
        return {"id": db_entry[2], "role": db_entry[3]} if result else False

    def check_username(self, username: str):
        db_entry = self.database.get_entry_from_db(
            "SELECT name, id, role FROM users WHERE name = ?", (username,))
        if not db_entry:
            return False
        return {"id": db_entry[1], "role": db_entry[2]}

    def verify_admin(self, token: str) -> bool:
        """
        Verifies if given token belongs to an admin user

        args:
            token (str): user-given token
        returns:
            bool: True if verification succesful, False otherwise
        """
        result = credentials.decode_token(token, self.secret_key)
        if result:
            query = "SELECT role FROM users WHERE id=?"
            db_entry = self.database.get_entry_from_db(
                query, (result['user_id'], ))
            if db_entry[0] == 1:
                return True
        return False

    def get_all_users(self) -> list:
        """
        Fetches all users from database

        returns:
            user_list (list)
        """
        query = "SELECT * FROM users"
        result = self.database.get_list_from_db(query, ())
        user_list = [
            {
                "id": row[0],
                "name": row[1],
                "password": row[2].decode('utf-8') if not isinstance(row[2], str) else row[2]
            }
            for row in result
        ]

        return user_list

    def change_password(self, user_id: str, password: str) -> bool:
        """
        Updates password value for single entry in users table

        args:
            id (str): id of given user
            password (str): new password to be updated
        returns:
            bool: True if succesful, else otherwise
        """
        pass_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pass_bytes, salt)
        query = "UPDATE users SET password=? WHERE id=?"
        values = (hashed, user_id)
        result = self.database.insert_entry(query, values)

        return result == "OK"


def fetch_token(headers: dict) -> Union[bytes, bool]:
    bearer = headers.get('Authorization', None)
    if not bearer:
        return False
    token = bearer.split()[1]

    return token
