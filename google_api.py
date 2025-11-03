import io
import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SERVICE_ACCOUNT_FILE = "scout-service-account.json"
SCOPES = ["https://www.googleapis.com/auth/drive"]

ROOT_FOLDER_ID = "1xQdgDzKnREknBzIAsLn_4DeF2lFVpNnW"
# https://drive.google.com/drive/folders/abc123XYZ "abc123XYZ" is the ID


# auth
def get_drive_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds)


def find_folder(service, name, parent_id):
    """
    gets the folder ID of the folder
    :returns folder ID or None
    """
    query = f"name = '{name}' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, fields="files(id, name)", supportsAllDrives=True).execute()
    folders = results.get("files", [])
    return folders[0]["id"] if folders else None


def create_folder(service, name, parent_id):
    """
    create a folder and return its ID
    :returns folder ID
    """
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def get_or_create_scout_folder(service, scout_name):
    """
    find or create a subfolder under the root folder for the given scout
    :returns folder ID.
    """
    folder_id = find_folder(service, scout_name, ROOT_FOLDER_ID)
    if not folder_id:
        folder_id = create_folder(service, scout_name, ROOT_FOLDER_ID)
    return folder_id


# UPLOAD CODE VVVVV
def upload_scout_evaluation(scout_first: str, scout_last: str, rank: str, content: str):
    """
    uploads text file to Google Drive in the scout's folder
    naming format: MM.DD.YYYY - FIRST LAST_RANK_Evaluation.txt
    """
    service = get_drive_service()

    # folder name (scout name)
    scout_name = f"{scout_first.strip().title()} {scout_last.strip().title()}"

    # gets folder for scout
    scout_folder_id = get_or_create_scout_folder(service, scout_name)

    # full name of file
    today = datetime.date.today().strftime("%m.%d.%Y")
    filename = f"{today} - {scout_first.strip().title()} {scout_last.strip().title()}_{rank.title()}_Evaluation.txt"

    # uploads txt doc
    media = MediaIoBaseUpload(io.BytesIO(content.encode("utf-8")), mimetype="text/plain")
    file_metadata = {"name": filename, "parents": [scout_folder_id]}

    uploaded = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id", supportsAllDrives=True)
        .execute()
    )
    return uploaded.get("id")