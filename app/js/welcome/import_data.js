el('location-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ipcRenderer.send('storageSaveLocation:locate', el('location-nf-accuracy-slider').value);
})

queryAll('#data-import-select-column input[type="radio"]').forEach(element => {
    element.addEventListener('click', (e) => {
        console.log(element.value);
        queryAll('.data-import-form').forEach(importForm => {
            importForm.classList.add('hidden');
        });
        console.log('#data-import-' + element.value + '-form');
        el('data-import-' + element.value + '-form').classList.remove('hidden');
    })
});

el('data-import-aldeia-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let inputFornecedores = el('financeiro-aldeia-fornecedores-input');
    let inputCompras = el('financeiro-aldeia-compras-input');
    if (inputFornecedores.files.length == 0) {
        showTempMessage('Arquivo de fornecedores?', 'warning');
        return;
    }
    if (inputCompras.files.length == 0) {
        showTempMessage('Arquivo de compras?', 'warning');
        return;
    }

    let data = {
        saveLocation: query('.storage-save-location-input-result').innerHTML,
        nfAccuracy: el('aldeia-nf-accuracy-slider').value,
        supliersPath: inputFornecedores.files[0].path,
        expensesPath: inputCompras.files[0].path
    };
    console.log(data);
    ipcRenderer.send('import:aldeia', data);

});