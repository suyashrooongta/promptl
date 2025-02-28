import axios from "axios";
import { useEffect, useState } from "react";

export default function Help() {
    const [name, setName ] = useState("");
    useEffect(() => {
        axios.get("/api/hello").then(response => {
            console.log(response.data);
            setName(response.data.name);
        });
    }, [])
    return (

     <div> Help page: {name}</div>
    );
  }

