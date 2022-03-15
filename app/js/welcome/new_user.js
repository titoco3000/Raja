let companiesNumbers = []
addCompany()

function addCompany() {
    companiesNumbers.push(0)
    el("companies-sectors-tree-companies-buttons").insertAdjacentHTML("beforeBegin", `
        <div class="companies-sectors-tree-company">
            <div class="companies-sectors-tree-entries" >
                <div class="companies-sectors-tree-column companies-sectors-tree-company-column">
                    <div class="company-input-holder">
                        <input type="text" name="" id="" value="Empresa" class="companies-sectors-tree-company-input companies-sectors-tree-input">
                    </div>
                    <footer class="companies-sectors-tree-column-footer"></footer>
                </div>
                <div class="companies-sectors-tree-column companies-sectors-tree-bracket-column">
                    <svg id=bracket"`+ companiesNumbers.length + `" class="bracket-vector"></svg>
                    <footer class="companies-sectors-tree-column-footer"></footer>
                </div>
                <div class="companies-sectors-tree-column companies-sectors-tree-sectors-column">
                    <footer class="companies-sectors-tree-column-footer companies-sectors-tree-sector-footer">
                        <button type='button' onclick="addSector(`+ (companiesNumbers.length - 1) + `)">+</button>
                        <button type='button' onclick="removeSector(`+ (companiesNumbers.length - 1) + `)">-</button>
                    </footer>
                </div>
            </div>
        </div>
    `
    );
    addSector(companiesNumbers.length - 1);
}
function removeCompany() {
    if (companiesNumbers.length > 1) {
        let rows = queryAll('.companies-sectors-tree-company');
        rows[rows.length - 1].remove();
        companiesNumbers.pop();
    }
}

function addSector(company) {
    companiesNumbers[company]++;
    queryAll('.companies-sectors-tree-company')[company].children[0].children[2].lastElementChild.insertAdjacentHTML('beforeBegin', `
        <input type="text" name="sector-input" class="companies-sectors-tree-input companies-sectors-tree-sector-input" value="Setor">
    `);

}
function removeSector(company) {
    if (companiesNumbers[company] > 1) {
        companiesNumbers[company]--;
        let parent = queryAll('.companies-sectors-tree-company')[company].children[0].children[2];
        parent.children[parent.children.length - 2].remove();
    }
}

//inbox options
let totalInboxes = 0
addInboxOption();
function addInboxOption() {
    totalInboxes++;
    el("inbox-list-buttons").insertAdjacentHTML("beforeBegin", `
        <input type="text" name="" class="inbox-input" value="Banco `+ totalInboxes + `">
    `);
}
function removeInboxOption() {
    totalInboxes--;
    let parent = el("inbox-list")
    if (parent.children.length > 2) {
        parent.children[parent.children.length - 2].remove();
    }
}

//payment options
let paymentSugestions = ['Boleto', 'Cheque', 'TED', 'Cartão de Crédito', 'Cartão de Débito', 'PIX']
let totalPaymentOptions = 0;
addPaymentOption();
function addPaymentOption() {
    let sugestion = (totalPaymentOptions < paymentSugestions.length ? paymentSugestions[totalPaymentOptions] : 'Outro tipo de pagamento');
    totalPaymentOptions++;
    el("payment-list-buttons").insertAdjacentHTML("beforeBegin", `
        <input type="text" name="" class="payment-input" value="`+ sugestion + `">
    `);
}
function removePaymentOption() {
    let parent = el("payment-list")
    if (parent.children.length > 2) {
        totalPaymentOptions--;
        console.log("removing");
        parent.children[parent.children.length - 2].remove();
    }
}

el('new-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let data = {
        companies: [],
        sectors: [],
        inboxOptions: [],
        paymentOptions: [],
    };

    let companyInputs = queryAll('.companies-sectors-tree-company-input');
    let sectorInputs = queryAll('.companies-sectors-tree-sector-input');

    let maxReachedSector = 0;
    let errorMessage = '';

    for (let i = 0; i < companyInputs.length; i++) {
        if (companyInputs[i].value.replace(/\s/g, '') === '') {
            errorMessage = 'Empresa com nome vazio';
        }
        if (data.companies.some(elem => elem == companyInputs[i].value)) {
            errorMessage = 'Nome de empresa repetido';
        }
        data.companies.push(companyInputs[i].value);

        for (let j = maxReachedSector; j < maxReachedSector + companiesNumbers[i]; j++) {
            let sector = {
                name: sectorInputs[j].value,
                companyID: i + 1
            }
            if (sector.name.replace(/\s/g, '') === '') {
                errorMessage = 'Setor com nome vazio';

            }
            if (data.sectors.some(elem => elem.name == sector.name && elem.companyID == sector.companyID)) {
                errorMessage = 'Nome do setor repetido dentro da mesma empresa';
            }
            data.sectors.push(sector);
        }
        maxReachedSector += companiesNumbers[i]
    }

    queryAll('.inbox-input').forEach(element => {
        if (element.value.replace(/\s/g, '') === '') {
            errorMessage = 'Caixa com nome vazio';
        }
        if (data.inboxOptions.some(elem => elem == element.value)) {
            errorMessage = 'Caixa repetido';
        }
        data.inboxOptions.push(element.value);
    });

    queryAll('.payment-input').forEach(element => {
        if (element.value.replace(/\s/g, '') === '') {
            errorMessage = 'Método de pagamento com nome vazio';
        }
        if (data.paymentOptions.some(elem => elem == element.value)) {
            errorMessage = 'Método de pagamento repetido';
        }
        data.paymentOptions.push(element.value);
    });

    data.nfAccuracy = el('nf-accuracy-slider').value;
    data.saveLocation = el('initial-storage-save-location-result').innerHTML;

    if (errorMessage === '') {
        showTempMessage('Dados encaminhados!', 'success');
        ipcRenderer.send('database:new', data);
    }
    else {
        showTempMessage(errorMessage, 'warning');
    }
});
