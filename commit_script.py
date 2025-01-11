import os
import subprocess
from datetime import datetime

# Configuration
REPO_PATH = "./"  # Path to your Git repository
FILE_NAME = "dummy_file.txt"  # Name of the file to modify
NUM_COMMITS = 50  # Number of commits to make
COMMIT_MESSAGE = "New Commit"


def run_command(command):
    """Run a shell command and return its output."""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(e.output)
        return None


def setup_repo(path):
    """Navigate to the repo and initialize Git if necessary."""
    os.chdir(path)
    if not os.path.exists(".git"):
        print("Initializing Git repository...")
        run_command("git init")
        print("Git repository initialized.")


def make_changes(file_name, commit_number):
    """Write a dummy change to the file."""
    with open(file_name, "a") as f:
        f.write(f"Commit #{commit_number} made on {datetime.now()}\n")


def commit_changes(file_name, message):
    """Stage the file and commit changes."""
    run_command(f"git add {file_name}")
    run_command(f'git commit -m "{message}"')


def main():
    setup_repo(REPO_PATH)

    # Create a dummy file if it doesn't exist
    if not os.path.exists(FILE_NAME):
        print(f"Creating dummy file: {FILE_NAME}")
        open(FILE_NAME, "w").close()

    # Perform the specified number of commits
    for i in range(1, NUM_COMMITS + 1):
        print(f"Making commit #{i}...")
        make_changes(FILE_NAME, i)
        commit_changes(FILE_NAME, COMMIT_MESSAGE + f" ({i})")

    print(f"{NUM_COMMITS} commits have been made successfully!")


if __name__ == "__main__":
    main()
