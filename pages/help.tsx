import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';


export default function Help() {
    const [name, setName ] = useState("");
    useEffect(() => {
        const deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
            const newDeviceId = uuidv4();
            localStorage.setItem("deviceId", newDeviceId);
            
        axios.post("/api/log", {name: newDeviceId}).then(response => {
            console.log(response);
        })
        }
    }, [])
    useEffect(() => {
        axios.get("/api/hello").then(response => {
            console.log(response.data);
            setName(response.data.name);
        });
    }, [])
    return (

     <div> Help page: {name}
     <Image src="/file.svg" width={50} height = {50} alt = ""/>
     </div>
    );
  }

