#!/bin/bash

# Array of strings to check for TODOs
 todos=(
    "TODO:Remove Hard coded credential"
    "TODO:Remove btn send event FB"
    "TODO:Increment the two versions"
    "TODO:Set notification to 20s"
)

# Check for unfinished TODOs
unfinished_todos=()
for todo in "${todos[@]}"; do
    if [[ $todo == *"TODO"* ]]; then
        unfinished_todos+=("$todo")
    fi
done

# Display unfinished TODOs
if [[ ${#unfinished_todos[@]} -ne 0 ]]; then
    echo "Unfinished TODOs:"
    for todo in "${unfinished_todos[@]}"; do
        echo "- $todo"
        read -p "Is this TODO completed? (Y/N): " completed
        if [[ $completed == "N" || $completed == "n" ]]; then
            echo "Exiting script, please complete all TODOs before committing."
            read -p "Ok?"
            exit 1
        fi
    done
else
    echo "All TODOs are completed."
fi

# Prompt user for commit message
read -p "Enter commit message: " message

# Make the commit
git add .
git commit -m "$message"