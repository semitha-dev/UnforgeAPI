import React, { useState } from "react";

  type FormState = {
    name: string;
    email: string;
    password: string;
    education_level: string;

  }


export default function signup(){

 const [form, setForm] = useState<FormState>({
    name:'',
    email:'',
    password:'',
    education_level:''

 })

 const [loading, setLoading] = useState(false);
 const [message, setMessage] = useState<string | null>(null);

 



}