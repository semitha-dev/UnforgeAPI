"use client"

import React, { useState } from "react";



export default function SignupPage(){

    const [form, setForm] = useState({
        name:'',
        email:'',
        password:'',
        educationLevel:'',

    })
    const [loading, setLoading] = useState('')
    const [message, setMessage] = useState<string | null>(null)



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>{

        setForm({...form, [e.target.name]: e.target.value})

    }

    const handleSignup = async (e: React.FormEvent) =>{

    }


    return(
        <div className="h-screen w-full bg-[url('/sky.png')] bg-cover bg-center ">
            <form
            onSubmit={handleSignup}
            className="bg-white "
            >
                <h1>Create an Account</h1>

                <input
                type="text"
                name="name"
                placeholder="eg: john doe"
                value={form.name}
                onChange={handleChange}
                className="rounded border w-full m-1 "
                />

            </form>


        </div>
    )
}