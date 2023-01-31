let account;
let mintIndexForSale = 0;
let maxSaleAmount = 0;
let mintPrice = 0;
let mintStartBlockNumber = 0;
let mintLimitPerBlock = 0;

let blockNumber = 0;
let blockCnt = false;

// input part check right value at input
const myInput = document.getElementById("amount");
function onlyNumber(num){
    if(parseInt(num.value) > parseInt(num.max)){
        num.value = num.max;
    }
    else if (num.value == ''){
        num.value = num.min;
    }
    else{
        num.value = num.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    }
}
//input plus minus value
function stepper(btn){
    let id = btn.getAttribute("id");
    let min = myInput.getAttribute("min");
    let max = myInput.getAttribute("max");
    let step = myInput.getAttribute("step");
    let val = myInput.getAttribute("value");
    let calcStep = (id == "increment") ? (step*1) : (step * -1);
    let newValue = parseInt(val) + calcStep;

    if(newValue >= min && newValue <= max){
        myInput.setAttribute("value", newValue);
    }
}

// blockchain part
function cntBlockNumber() {
    if(!blockCnt) {
        setInterval(function(){
            blockNumber+=1;
            document.getElementById("blockNubmer").innerHTML = "#" + blockNumber;
        }, 1000);
        blockCnt = true;
    }
}

async function connect() {
    const accounts = await klaytn.enable();
    if (klaytn.networkVersion === 8217) {
        console.log("메인넷");
    } else if (klaytn.networkVersion === 1001) {
        console.log("테스트넷");
    } else {
        alert("ERROR: 클레이튼 네트워크로 연결되지 않았습니다!");
        return;
    }
    account = accounts[0];
    caver.klay.getBalance(account)
        .then(function (balance) {
            console.log(account,balance)
            document.getElementById("myWallet").innerHTML = `${account.replace(account.slice(7,-7),"...")}`
            document.getElementById("myKlay").innerHTML = `${caver.utils.fromPeb(balance, "KLAY")} KLAY`
        });
    await check_status();
}

async function check_status() {
    const myContract = new caver.klay.Contract(ABI, CONTRACTADDRESS);
    await myContract.methods.mintingInformation().call()
        .then(function (result) {
            console.log(result);
            mintIndexForSale = parseInt(result[1]);
            mintLimitPerBlock = parseInt(result[2]);
            mintStartBlockNumber = parseInt(result[4]);
            maxSaleAmount = parseInt(result[5]);
            mintPrice = parseInt(result[6]);
            console.log(mintPrice,mintStartBlockNumber)
            document.getElementById("mintCnt").innerHTML = `${mintIndexForSale - 1} / ${maxSaleAmount}`;
            document.getElementById("mintLimitPerBlock").innerHTML = `${mintLimitPerBlock}개`;
            document.getElementById('amount').max = mintLimitPerBlock;
            document.getElementById("mintStartBlockNumber").innerHTML = `#${mintStartBlockNumber}`;
            document.getElementById("mintPrice").innerHTML = `${caver.utils.fromPeb(mintPrice, "KLAY")} KLAY`;
        })
        .catch(function (error) {
            console.log(error);
        });
    blockNumber = await caver.klay.getBlockNumber();
    document.getElementById("blockNubmer").innerHTML = "#" + blockNumber;
    cntBlockNumber();
}

async function publicMint() {
    if (klaytn.networkVersion === 8217) {
        console.log("메인넷");
    } else if (klaytn.networkVersion === 1001) {
        console.log("테스트넷");
    } else {
        alert("ERROR: 클레이튼 네트워크로 연결되지 않았습니다!");
        return;
    }
    if (!account) {
        alert("ERROR: 지갑을 연결해주세요!");
        return;
    }

    const myContract = new caver.klay.Contract(ABI, CONTRACTADDRESS);
    const amount = document.getElementById('amount').value;
    await check_status();
    if (maxSaleAmount + 1 <= mintIndexForSale) {
        alert("모든 물량이 소진되었습니다.");
        return;
    } else if (blockNumber <= mintStartBlockNumber) {
        alert("아직 민팅이 시작되지 않았습니다.");
        return;
    }
    const total_value = amount * mintPrice;

    let estmated_gas;

    await myContract.methods.publicMint(amount)
        .estimateGas({
            from: account,
            gas: 6000000,
            value: total_value
        })
        .then(function (gasAmount) {
            estmated_gas = gasAmount;
            console.log("gas :" + estmated_gas);
            myContract.methods.publicMint(amount)
                .send({
                    from: account,
                    gas: estmated_gas,
                    value: total_value
                })
                .on("transactionHash", (txid) => {
                    console.log(txid);
                })
                .once("allEvents", (allEvents) => {
                    console.log(allEvents);
                })
                .once("Transfer", (transferEvent) => {
                    console.log(transferEvent);
                })
                .once("receipt", (receipt) => {
                    alert("민팅에 성공하였습니다.");
                    connect();
                })
                .on("error", (error) => {
                    alert("민팅에 실패하였습니다.");
                    console.log(error);
                    connect();
                });
        })
        .catch(function (error) {
            console.log(error);
            alert("민팅에 실패하였습니다.");
            connect();
        });
}