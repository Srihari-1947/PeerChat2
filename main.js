let uid=String(Math.floor(Math.random()*10000))
let localstream;
let remotestream;
let peerconnection;
let client;
let sendMessage;

let Member_Id = uid

const createWebSocketClient= async(url,memberId) => {

    let websocket = null;

   const connect= async()=>{
        websocket = new WebSocket(url)

        websocket.addEventListener('open', onOpen);
        websocket.addEventListener('message', onMessage);
        websocket.addEventListener('close', onClose);
        websocket.addEventListener('error', onError);
    }

    const register= async()=>{
        const registrationMessage = {'member_id': memberId}
        sendMessage(registrationMessage)
    }

    const sendMessage= async(message)=>{
        if(websocket.readyState == WebSocket.OPEN){
            websocket.send(JSON.stringify(message))
            console.log('sent message',JSON.stringify(message))
        }
        else{
            console.error("websocket is not open")
        }
    }

    const onOpen = () =>{
        console.log('connected to a singalling server')
        register()
    }

    const onMessage =async (data)=>{ 
        let message= JSON.parse(data.data)
        console.log('Parsed JSON object:',typeof(message.toString()),message.toString());
        if(message.toString()!='0'){
             
             if((message.toString())[0]=="1")
            {
                console.log(message)
                await handleUserJoined(message.toString().slice(1))
             }
             
             else{
                handleMessageFromPeer(message,message.source_id)
                
             }
        }

    }

    const onClose=()=>{
        console.log('disconnected from signalling server')
    }

    const onError = (error)=>{
        console.error('WebSocket error: ',error)
    }


    client = {
        connect,
        sendMessage
    };

    return client;
    
}


const servers = {
    iceserververs:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
        }
    ]
}
let init= async() => 
    {
        const url = 'wss://webrtc-05ak.onrender.com/'
        const client = await createWebSocketClient(url,Member_Id)
        client.connect()
        localstream= await navigator.mediaDevices.getUserMedia({video:true,audio:false})
        document.getElementById("user-1").srcObject= localstream
       
    } 
let handleUserLeft = async (memberId) =>
    {
        document.getElementById('user-2').style.display='none'
    }
let handleMessageFromPeer = async (message,memberId) => {
    if(message.type == "offer")
    {
        createanswer(memberId,message.offer)
    }

    if(message.type == 'answer')
    {
        addanswer(message.answer)
    }

    if(message.type == "candidate")
    {
        if(peerconnection)
        {
            peerconnection.addIceCandidate(message.candidate)
        }
    }
}


let handleUserJoined = async (memberId) => {
    console.log("A new user joined the channel",memberId)
    createoffer(memberId)
}


let createPeerConnection = async (memberId) => 
    {
        peerconnection=new RTCPeerConnection(servers) 

        remotestream= new MediaStream()
        document.getElementById('user-2').srcObject= remotestream
        document.getElementById('user-2').style.display = 'block'

        if(!localstream){
            localstream= await navigator.mediaDevices.getUserMedia({video:true,audio:false})
            document.getElementById("user-1").srcObject= localstream
        }
        localstream.getTracks().forEach((track) => {
            peerconnection.addTrack(track,localstream)
        })

        peerconnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {remotestream.addTrack(track)})
        }

        peerconnection.onicecandidate = async (event) => {
            if(event.candidate){
                console.log("New ICE candidate: ", event.candidate)
                client.sendMessage({"type":"candidate","candidate":event.candidate,'target_id':memberId,'source_id':Member_Id})
            }
        }

    }


let createoffer = async(memberId) =>
    {
        await createPeerConnection(memberId)

        let offer = await peerconnection.createOffer() 
        await peerconnection.setLocalDescription(offer)


        console.log("offer",offer)
        console.log("type",typeof Member_Id)
        client.sendMessage({"type":"offer","offer":offer,"target_id":memberId,'source_id':Member_Id})

    } 
    
let createanswer = async(memberId,offer) =>
    {
        await createPeerConnection(memberId)
        await peerconnection.setRemoteDescription(offer)

        let answer = await peerconnection.createAnswer()
        await peerconnection.setLocalDescription(answer)

        console.log("asnswer",answer)
        client.sendMessage({"type":"answer","answer":answer,"target_id":memberId,'source_id':Member_Id})

    }

let addanswer =async (answer) => {
    if(!peerconnection.currentRemoteDescription)
    {
       peerconnection.setRemoteDescription(answer)
    }
}

//let leaveChannel = async () => {
//    await channel.leave()
//    await client.logout()
//}

//window.addEventListener("beforeunload",leaveChannel)


init()
