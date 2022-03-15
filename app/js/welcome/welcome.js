document.getElementById('locate-button').addEventListener('click', (e) => {
    el('greetings-section').classList.add('hidden')
    el('locate-section').classList.remove('hidden')
})

document.getElementById('data-import-button').addEventListener('click', () => {
    el('greetings-section').classList.add('hidden')
    el('data-import-section').classList.remove('hidden')
})

el('new-user-button').addEventListener('click', () => {
    el('greetings-section').classList.add('hidden')
    el('new-user-section').classList.remove('hidden')
})

function ReturnToMethodSelection() {
    location.reload()
}

