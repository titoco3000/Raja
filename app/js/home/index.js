var configs;
//check if database exists
//request configs
ipcRenderer.send('configs:get');



var currentSection = 'home'

var firstIndex = 0
var rowsPerPage = 30;
var sortingMethod = 'value';
var sortingDirection = 'DESC';



function destroyViewTable() {
    el('view-table').innerHTML = '';
}

function buildViewTable() {
    el('view-table').innerHTML = `
        <thead>
            <tr>
                <th>Data</th>
                <th>Fornecedor</th>
                <th>Empresa</th>
                <th>Setor</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>NF</th>
                <th>Caixa</th>
                <th>Observações</th>
            </tr>
        </thead>
        <tbody id="view-table-body"></tbody>
        <tfoot></tfoot>
    `;
    ipcRenderer.send('expenses:get', {
        orderBy: `${sortingMethod} ${sortingDirection}`,
        quantity: rowsPerPage,
        startIndex: firstIndex
    });
}

function buildFormSection() {
    ipcRenderer.invoke('supliers:get').then((result) => {
        SearchBox(el('suplier-search'), result.map(e => {
            return e.name;
        }), suplier => {
            ipcRenderer.invoke('payment:get', suplier).then((result) => {
                console.log(result);
            });
        });
    });
    // add all inputs
    ipcRenderer.invoke('inbox:get').then((result) => {
        let select = el('form-inbox-input');
        let inner = '';
        result.forEach(e => {
            inner += `<option class="form-input-option" value="${e.inboxID}">${e.name}</option>`;
        });
        select.innerHTML = inner;
    });
    ipcRenderer.invoke('payment:get').then((result) => {
        let select = el('form-payment-input');
        let inner = '';
        result.forEach(e => {
            inner += `<option class="form-input-option" value="${e.paymentID}">${e.name}</option>`;
        });
        select.innerHTML = inner;
    });
    ipcRenderer.invoke('sectors:get').then((result) => {
        let select = el('form-sector-input');
        let inner = '';
        result.forEach(e => {
            inner += `<option class="form-input-option" value="${e.sectorID}"><span class="company-option-span"> ${e.company}</span><span class="company-option-span"> ${e.name}</span></option>`;
        });
        select.innerHTML = inner;
    });

}

function setOpenSection(caller, id) {
    if (id === 'view' && currentSection !== 'view') {
        buildViewTable();
    }
    else if (id !== 'view' && currentSection === 'view') {
        destroyViewTable();
    }
    else if (id === 'form' && currentSection !== 'form') {
        buildFormSection();
    }
    hide(el('home-section'));
    hide(el('form-section'));
    hide(el('info-section'));
    hide(el('view-section'));
    hide(el('tools-section'));
    show(el(id + '-section'));

    queryAll('.active-area-button').forEach(element => {
        element.classList.remove('active-area-button');
    });
    caller.classList.add('active-area-button');
    currentSection = id;
}

function viewTablePageDown() {
    ipcRenderer.send('expenses:get', {
        orderBy: `${sortingMethod} ${sortingDirection}`,
        quantity: rowsPerPage,
        startIndex: firstIndex + rowsPerPage
    });
}
function viewTablePageUp() {
    ipcRenderer.send('expenses:get', {
        orderBy: `${sortingMethod} ${sortingDirection}`,
        quantity: rowsPerPage,
        startIndex: firstIndex - rowsPerPage
    });
}
//receive configs
ipcRenderer.on('configs:set', async (e, config) => {
    if (config.saveLocation) {
        console.log('going request initiate');
        ipcRenderer.send('storage:initiate', { path: config.saveLocation });
        configs = config;
        resizableGrid(el('view-table'));
    }
    else {
        //move to welcoming screen
        window.location.href = 'welcome.html';

    }
})


ipcRenderer.on('viewTable:set', (e, data) => {
    firstIndex = data.startIndex;
    let bodyContent = '';
    data.content.forEach((e) => {
        let dateArr = e.date.split('-');
        bodyContent += `
            <tr>
                <td>${dateArr[2]}/${dateArr[1]}/${dateArr[0].substring(2)}</td>
                <td>${e.suplier}</td>
                <td>${e.company}</td>
                <td>${e.sector}</td>
                <td>${formatMoney(e.value)}</td>
                <td>${e.payment}</td>
                <td>${formatNF(e.NF)}</td>
                <td>${e.inbox}</td>
                <td>${e.description}</td>
            </tr>`;
    });
    el('view-table-body').innerHTML = bodyContent;
    resizableGrid(el('view-table'));
})

