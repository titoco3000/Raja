const { webFrame, ipcRenderer } = require('electron');

var configs;

// Create a number formatter.
var formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency', //if want R$, uncomment these
    currency: 'BRL',
});

function el(id) {
    return document.getElementById(id)
}
function query(q, all = false) {
    if (all) {
        throw Error("Deprecated; use queryAll");
    }
    return document.querySelector(q)
}
function queryAll(q) {
    return Array.from(document.querySelectorAll(q));
}
function hide(element) {
    element.classList.add('hidden')
}
function show(element) {
    element.classList.remove('hidden')
}

function auto_grow(element) {
    element.style.height = "5px";
    element.style.height = (element.scrollHeight) + "px";
}

function formatNF(number) {
    number = number.toString();
    let maxNum = configs ? configs.nfAccuracy : 6;
    while (number.length < maxNum) {
        number = '0' + number;
    }
    return number.substring(number.length - maxNum)
}

function formatMoney(float, withoutLabel = false) {
    return withoutLabel ? formatter.format(float).slice(3) : formatter.format(float);
}


function moneyInput(element) {
    element.addEventListener('input', () => {
        let number = element.value.replace('.', '').replace('.', '').replace(/\D/g, '');
        number = number.slice(0, number.length - 2) + "." + number.slice(number.length - 2);
        number = formatMoney(parseFloat(number), true);
        if (number == NaN) {
            number = 0.00;
        }

        let caretPos = element.selectionStart + (number.length - element.value.length);
        element.value = number;
        element.selectionStart = caretPos;
        element.selectionEnd = caretPos;
    })
}

//temp message
let timeoutID;
function showTempMessage(msg, level = 'warning', time = 3) {
    let element = query('#temp-message');

    let hideTempMsg = () => {
        element.classList.remove("temp-message-visible")
        void element.offsetWidth;
        element.classList.add("temp-message-invisible")
    }

    if (element === null) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="temp-message" class="temp-message-visible">
                <p></p>
                <div id="temp-message-buttons">
                    <button>ok</button>
                </div>
            </div>
        `)
        element = query('#temp-message');
        element.children[1].children[0].addEventListener('click', hideTempMsg);
    }

    element.children[0].innerHTML = msg;

    if (level === 'success') {
        element.style.backgroundColor = 'rgb(68 151 38)';
    }
    else if (level === 'warning') {
        element.style.backgroundColor = 'rgb(165, 165, 43)';
    }
    else if (level === 'error') {
        element.style.backgroundColor = 'rgb(181 31 31)';
    }
    else {
        element.style.backgroundColor = 'var(--themeBackgroundGray)';
    }


    if (timeoutID) {
        clearTimeout(timeoutID);
    }

    element.classList.remove("temp-message-invisible")
    element.classList.remove("temp-message-visible")
    void element.offsetWidth;
    element.classList.add("temp-message-visible")

    timeoutID = setTimeout(hideTempMsg, time * 1000);

}

//confirmation document
function showExpenseValueConfirmation(expense, onConfirm, onDecline) {

    var coverDiv = document.createElement('div');
    coverDiv.classList.add('screen-cover');
    coverDiv.innerHTML = `
        <div class="expense-confirmation-card">
            <h1>Confirmação de Compra</h1>
            <p>Fornecedor: <span>${expense.suplier}</span></p>
            <p>Data: <span>${expense.date}</span></p>
            <p>Nota Fiscal: <span>${expense.nf}</span></p>
            <p>Valor: <span>${expense.value}</span></p>
            <p>Setor: <span >${expense.sector}</span></p>
            <p>Método de Pagamento: <span>${expense.payment}</span></p>
            <p>Caixa: <span >${expense.inbox}</span></p>
            <p>Observações: <span>${expense.description}</span></p>
            <button class="expense-decline">Cancelar</button>
            <button class="expense-confirm">Confirmar</button>
        </div>
    `;
    document.body.insertAdjacentElement('beforeend', coverDiv);

    coverDiv.querySelector('.expense-confirm').addEventListener('click', () => {
        onConfirm();
        coverDiv.remove();
    });
    coverDiv.querySelector('.expense-decline').addEventListener('click', () => {
        onDecline();
        coverDiv.remove();
    });

}

queryAll('.storage-save-location-input').forEach(element => {
    element.addEventListener('click', () => {
        ipcRenderer.send('storageSaveLocation:get');
    })
});

ipcRenderer.send('defaultStoragePath:get');
ipcRenderer.on('defaultStoragePath:set', (evt, message) => {
    queryAll('.storage-save-location-input-result').forEach(element => {
        element.innerHTML = message.path;
    });
});

/* range */
function onVisible(element, callback) {
    new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0) {
                callback(element);
                observer.disconnect();
            }
        });
    }).observe(element);
}

queryAll('.range-container').forEach(element => {
    onVisible(element.children[0], () => {
        positionRangeHandle(element);
        element.children[1].children[0].innerHTML = element.children[0].value;
    });

    element.children[0].addEventListener('input', () => {
        positionRangeHandle(element);
        element.children[1].children[0].innerHTML = element.children[0].value;
    });
    element.children[0].addEventListener('mouseup', () => {
        positionRangeHandle(element);
    });
    element.children[0].addEventListener('mousedown', () => {
        positionRangeHandle(element);
    });
    element.children[0].addEventListener("visibilitychange", () => {
        console.log("changed");
        positionRangeHandle(element);
    });
});

function positionRangeHandle(container) {
    let range = container.children[0];
    let knob = container.children[1];
    knob.style.left = (range.value - range.min) / (range.max - range.min) * (range.offsetWidth - knob.offsetWidth) + "px";
}

function repositionAllRangeHandles() {
    queryAll('.range-container').forEach(element => {
        positionRangeHandle(element);
    });
}

window.addEventListener('resize', () => {
    repositionAllRangeHandles()
});
repositionAllRangeHandles();
/*end range*/

/*file input*/
queryAll('.file-input').forEach((element) => {
    element.children[2].addEventListener('change', (e) => {
        let value = element.children[2].files.length > 0 ? element.children[2].files[0].path.replace(/^.*?([^\\\/]*)$/, '$1') : 'escolher arquivo';
        element.children[1].innerHTML = value;
    })
})
/*end file input*/



//receive configs
ipcRenderer.on('configs:set', async (e, config) => {
    configs = config;
});

console.log(webFrame.getZoomFactor());
webFrame.setZoomFactor(1);



