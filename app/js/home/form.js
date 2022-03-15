el('form-nf-input').addEventListener('input', ev => {
    ev.target.value = formatNF(ev.target.value);
});

moneyInput(el('form-value-input'));

function clearForm() {
    query('#form-section form').reset();
}

query('#form-section form').addEventListener('submit', e => {
    e.preventDefault();
    let form = e.target;
    const formData = new FormData(form);

    let suplier = formData.get('Suplier');
    let date = formData.get('expense-date').replace('.', '').replace(',', '.');
    let nf = formData.get('form-nf-input');
    let value = formData.get('form-value-input');
    let description = formData.get('form-description-input');
    let sector = formData.get('form-sector-input');
    let payment = formData.get('form-payment-input');
    let inbox = formData.get('form-inbox-input');
    if (suplier === '') {
        showTempMessage('Fornecedor vazio');
        el('form-suplier-name-input').focus();
    }
    else if (date === '') {
        showTempMessage('Data vazia');
        el('expense-date').focus();
    }
    else {
        let splitDate = date.split('-');
        showExpenseValueConfirmation({ suplier, 'date': splitDate[2] + '/' + splitDate[1] + '/' + splitDate[0], nf, 'value': 'R$' + value, description, 'sector': el('form-sector-input').children[sector].innerHTML, 'payment': el('form-payment-input').children[payment].innerHTML, 'inbox': el('form-inbox-input').children[inbox].innerHTML },
            () => {
                ipcRenderer.send('expenses:add', { suplier, date, nf, value, description, sector, payment, inbox });
            }, clearForm);
    }
});

ipcRenderer.on('newExpense:result', (e, val) => {
    if (val.error) {
        showTempMessage(val.error, 'error');
        if (val.code === 7) {
            el('form-nf-input').focus();
        }
    }
    else {
        showTempMessage('Nova compra criada!', 'success', 6);
        clearForm();
    }
})