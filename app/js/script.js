
//Should be loaded from storage
let companies = [
    {
        company:'Hotel',
        sectors:[
            "manutenção",
            "gastos trabalhistas"
        ]
    },
    {
        company:'Restaurante',
        sectors:[
            "manutenção",
            "gastos trabalhistas",
            "equipamento"
        ]
    },
]

//Should be loaded from storage
let providers = [
    {
        name:"Loja A",
        prefered_payment:"TED",
        company:"Restaurante"
    },
    {
        name:"Loja B",
        prefered_payment:"Cartão",
        company:"Hotel"
    }

]

let userConfigs = {
    storedData:{
        required:[
            {
              label:'Fornecedor',
              type:'string',
              autocomplete:providers.map(({name}) => name) //make array of the providers' names
            },
            {
                label:'Valor',
                type:'float',
                isMoney:true
            },
            {
                label:'Nota Fiscal',
                type:'int',
                limit:0
            },
            {
                label:'Data de Compra',
                type:'date'
            },
            {
                label:'Data de Modificação',
                type:'date'
            },
            {
                label:'Empresa',
                type:'select',
                values:companies.map(({company}) => company) //make array of the companies' names
            },
            {
                label:'Setor',
                type:'select',
                values:[].concat.apply([], companies.map(({sectors}) => sectors)) //make array of the companies' sectors
            },
            
        ],
    }        
}

