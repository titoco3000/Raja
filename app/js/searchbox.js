const Fuse = require('fuse.js')

function SearchBox(element, searchList, onSelect) {
    const fuse = new Fuse(searchList);
    let input = element.querySelector('.search-box input[type="text"]');
    let onClickOrEdit = () => {
        let matches = fuse.search(input.value);
        matches = matches.map(e => { return e.item });
        if (matches.length === 0) {
            matches = searchList;
        }
        let resultsBox = element.querySelector('.dropdown-search-results');
        resultsBox.innerHTML = '';
        matches.forEach(searchElement => {
            let button = document.createElement('div');
            button.classList.add('dropdown-search-result');
            show(button);
            button.innerHTML = searchElement;
            resultsBox.appendChild(button);
            button.addEventListener('click', (e) => {
                console.log("button click");
                e.preventDefault();
                if (onSelect)
                    onSelect(searchElement);
                element.querySelector('.search-box input[type="text"]').value = searchElement;
                element.querySelectorAll('.dropdown-search-results dropdown-search-result').forEach(b => {
                    hide(b);
                });
            })
        });
    }
    input.addEventListener('input', () => {
        onClickOrEdit();
    });
    input.addEventListener('click', () => {
        onClickOrEdit();
    });
    element.querySelector('.clear-search-button').addEventListener('click', e => {
        input.value = '';
        input.focus();
        onClickOrEdit();
    });
}