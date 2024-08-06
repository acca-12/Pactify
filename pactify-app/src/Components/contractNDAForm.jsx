import React, { useState } from "react";
import Footer from "./footer";
import NavBar from "./navBar";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Buffer } from "buffer";
import Saveform from "./Save";
import { ReactNotifications, Store } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import RichEditor from "./richTextEditor";
import { handleOpenSave, handleCloseSave, handleSubmit } from "../uploadUtils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from "react";


function ContractNDAForm() {
    const navigate = useNavigate();
    const [isResponseVisible, setIsResponseVisible] = useState(false);
    const [response, setResponse] = useState('');
    const [isloading, setLoading] = useState(false);
    const [date, setDate] = useState('');
    const [startDate, setStartDate] = useState();
    const [endDate, setEndDate] = useState();
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const contentRef = useRef(null);



    const handleStartChange = (date) => {
        setDate(date);
        if (!startDate) {
            setStartDate(date);
        }
    };

    const goSign = () => {
        navigate("/signature");
    }


    function generateContract() {
        let style = document.getElementById("style").value;
        let provider = document.getElementById("provider").value;
        let recipient = document.getElementById("recipient").value;
        let province = document.getElementById("province").value;
        let agreementDate = document.getElementById("date-of-agreement").value;
        let confidentialInfo = document.getElementById("confidential-info").value;
        let startDuration = document.getElementById("start-date").value;
        let endDuration = document.getElementById("end-date").value;
        let instructions = document.getElementById("instructions").value;

        //If style or instructions are empty, display error message
        if (style === "" || provider === "" || recipient === "" || agreementDate === "" || confidentialInfo === "" || startDuration === "" || province === "") {
            document.getElementById("error").innerHTML = "Please fill in all necessary entries.";
            return false;
        }
        else {
            let styleString = "";
            if (style === "Formal") {
                styleString = "This is a formal contract, meaning that it should be written in a professional manner. It should be used for business purposes.\
                               Legal language and formatting should be used. There should be a clear section for signatures at the bottom. \
                               Include sections 'Parties', 'Confidential Information', 'Return of Information', 'Duration of Agreement', 'Ownership', 'Governing Law'. \
                               Be sure to include other regular boilerplate clauses/sections such that are necessary for a formal Non-Disclosure agreemnt contract.";
            } else if (style === "Informal") {
                styleString = "This is an informal contract. It should be used for personal purposes.";
            }
            //removes previous error message during successful contract generation
            document.getElementById("error").innerHTML = "";
            setLoading(true);
            axios({
                method: "post",
                url: "http://localhost:5050/api/chatGPT",
                withCredentials: true,
                data:
                {
                    "context": `You are an AI contract generator. You are tasked with generating a non-disclosure agreement contract based on the user's instructions.\
                                The given information should be naturally weaved into a standard rental agreement format. ${styleString}. \
                                IMPORTANT: Use <br> for line breaks between paragraphs. Before and after every header, use <br>. Use HTML formatting for the contract.\
                                Use <h1> for headings, <h2> for subheadings, <p> for paragraphs, <ul> for lists, <li> for list items, <b> for bold text, <i> for italic text, <u> for underlined text.`,
                    "message": `Provider: ${provider}, 
                    Recipient: ${recipient},
                    Province: ${province},
                    Agreement date (MM/DD/YYYY): ${agreementDate}, 
                    Confidential Info: ${confidentialInfo}, 
                    Start date of duration of contract (MM/DD/YYYY): ${startDuration}, 
                    End date of duration of contract (MM/DD/YYYY): ${endDuration} (if no end date specified, then it's an indefinite contract), 
                    Other instructions for the contract made by user: ${instructions}`,
                },
            }) //
                .then((res) => {
                    let contract = res.data.message[1].content;
                    contract = contract.replace("```html", ""); //Strip ```html from the beginning of the contract
                    contract = contract.replace("```", ""); //Strip ``` from the end of the contract
                    setResponse(contract);
                    console.log("Contract Generated!");
                    setLoading(false);
                    setIsResponseVisible(true);
                })

                .catch(function (error) {
                    if (error.response) {
                        // The request was made and the server responded with a status code
                        // that falls out of the range of 2xx
                        console.log(error.response.data);
                        console.log(error.response.status);
                        console.log(error.response.headers);
                        document.getElementById("error").innerHTML = "Something went wrong. Please try again later.";
                    } else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                        // http.ClientRequest in node.js
                        console.log(error.request);
                        console.log(document.cookie);
                    } else {
                        // Something happened in setting up the request that triggered an Error
                        console.log("Error", error.message);
                    }
                }
                );
        }
    }


    function saveAndDirect() {
        const contractContent = Buffer.from(response, 'utf8');
        axios({
            method: "post",
            url: "http://localhost:5050/api/uploadFile",
            withCredentials: true,
            data: { "content": contractContent, "name": "filler" }
        }).then((res) => {
            navigate("/home");
        })
    }

    const exportToPDF = () => {
        if (contentRef.current) {
            html2canvas(contentRef.current, { scale: 2 }).then((canvas) => {
                const ctx = canvas.getContext('2d');
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                // Define the cropping area (x, y, width, height)
                const cropX = 20; // Adjust as needed
                const cropY = 130; // Adjust to crop the top toolbar
                const cropWidth = imgWidth - 50; // Adjust to crop from left and right
                const cropHeight = imgHeight - 130; // Adjust to crop from bottom

                // Create a new canvas to draw the cropped image
                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = cropWidth;
                croppedCanvas.height = cropHeight;

                const croppedCtx = croppedCanvas.getContext('2d');

                // Draw the cropped image onto the new canvas
                croppedCtx.drawImage(
                    canvas,
                    cropX, cropY, cropWidth, cropHeight, // Source rectangle
                    0, 0, cropWidth, cropHeight // Destination rectangle
                );

                const imgData = croppedCanvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');

                // Define margins and padding
                const marginLeft = 10;
                const marginTop = 10;
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                // Calculate image dimensions for the PDF
                const pdfImgWidth = pdfWidth - marginLeft * 2;
                const pdfImgHeight = (croppedCanvas.height * pdfImgWidth) / croppedCanvas.width;

                if (pdfImgHeight > pdfHeight - marginTop * 2) {
                    const adjustedHeight = pdfHeight - marginTop * 2;
                    const adjustedWidth = (croppedCanvas.width * adjustedHeight) / croppedCanvas.height;
                    pdf.addImage(imgData, 'PNG', marginLeft, marginTop, adjustedWidth, adjustedHeight);
                } else {
                    pdf.addImage(imgData, 'PNG', marginLeft, marginTop, pdfImgWidth, pdfImgHeight);
                }

                pdf.save('nda-contract.pdf');
            }).catch((error) => {
                console.error('Error capturing or cropping the content:', error);
            });
        } else {
            console.error('Content container is not available.');
        }
    };

    return (
        <div>
            <NavBar />
            <ReactNotifications />
            <div className="min-h-screen flex flex-col justify-between place-items-center bg-slate-100 p-8">
                <div className="flex flex-col w-7/12 p-8 rounded-lg mt-10">
                    <button onClick={() => navigate(-1)} className="mb-4 w-min mt-4 inline-block bg-red-500 text-white py-2 px-2 rounded-full font-black hover:bg-red-700 transition duration-300 hover:scale-105">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-4xl font-bold mb-2">Non-Disclosure Agreement</h1>
                    <h2 className="text-2xl font-bold mb-6">Enter Information</h2>
                    <div className="mb-4">
                        <label className="block text-lg font-medium text-gray-700 mb-2" htmlFor="style">
                            Style
                        </label>
                        <div className="flex items-center">
                            <select
                                id="style"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500"
                            >
                                <option className=" text-gray-500" value="">Select an option</option>
                                <option value="Formal">Formal</option>
                                <option value="Informal">Informal</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-700">
                            Provider:
                        </label>
                        <div className="font-small text-slate-600 mb-2">
                            The party disclosing the information
                        </div>
                        <div className="flex items-center">
                            <input
                                id="provider"
                                type="text"
                                placeholder="Name"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm overflow-y-auto resize-y focus:outline-none focus:ring-4 focus:ring-red-500"
                            ></input>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-700">
                            Recipient:
                        </label>
                        <div className="font-small text-slate-600 mb-2">
                            The party receiving the information
                        </div>
                        <div className="flex items-center">
                            <input
                                id="recipient"
                                type="text"
                                placeholder="Name"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm overflow-y-auto resize-y focus:outline-none focus:ring-4 focus:ring-red-500"
                            ></input>
                        </div>
                    </div>
                    <div className="flex flex-col mb-4">
                        <label className="block text-base font-normal text-gray-700 mb-2">
                            Province:
                        </label>
                        <div className="relative">
                            <select
                                id="province"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500"
                            >
                                <option className="text-gray-500" value="">Select an option</option>
                                <option value="AB">Alberta</option>
                                <option value="BC">British Columbia</option>
                                <option value="MB">Manitoba</option>
                                <option value="NB">New Brunswick</option>
                                <option value="NL">Newfoundland and Labrador</option>
                                <option value="NS">Nova Scotia</option>
                                <option value="ON">Ontario</option>
                                <option value="PE">Prince Edward Island</option>
                                <option value="QC">Quebec</option>
                                <option value="SK">Saskatchewan</option>
                                <option value="NT">Northwest Territories</option>
                                <option value="NU">Nunavut</option>
                                <option value="YT">Yukon</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-4" >
                        <label className="block text-base font-medium text-gray-700 mb-2">
                            Date of Agreement (MM/DD/YYYY):
                        </label>
                        <DatePicker
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500"
                            id="date-of-agreement"
                            selected={date} onChange={handleStartChange}
                            label="Select Date">
                        </DatePicker>
                    </div>

                    <div className="mb-4" >
                        <label className="block text-base font-medium text-gray-700 mb-2">
                            Duration of Agreement (MM/DD/YYYY):
                        </label>
                        <div className="flex flex-row gap-4 items-center mb-2">
                            <DatePicker
                                id="start-date"
                                selected={startDate} onChange={(date) => setStartDate(date)}
                                startDate={startDate}
                                placeholderText="Start Date"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500"
                            />
                            <label className="block text-base font-normal text-gray-700 mb-2">
                                to
                            </label>
                            <DatePicker
                                id="end-date"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500"
                                selected={endDate} onChange={(date) => setEndDate(date)}
                                endDate={endDate}
                                startDate={startDate}
                                minDate={startDate}
                                placeholderText="End Date"
                            />
                        </div>
                        <div className="font-small text-slate-500 mb-2">
                            You may leave the 'End Date' blank if the duration is indefinite
                        </div>

                    </div>

                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-700">
                            Definition of Confidentiality:
                        </label>
                        <div className="font-small text-slate-600 mb-2">
                            What information is considered confidential? What is not?
                        </div>
                        <div className="flex items-center">
                            <textarea
                                id="confidential-info"
                                type="text"
                                rows={4}
                                placeholder="Specify the confidential information"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm overflow-y-auto resize-y focus:outline-none focus:ring-4 focus:ring-red-500"
                            ></textarea>
                        </div>
                    </div>


                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-700">
                            Handling a Breach in Confidentiality:
                        </label>
                        <div className="font-small text-slate-600 mb-2">
                            What happens if the contract is breached?
                        </div>
                        <div className="flex items-center">
                            <textarea
                                id="breach"
                                type="text"
                                rows={4}
                                placeholder="Specify the confidential information"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm overflow-y-auto resize-y focus:outline-none focus:ring-4 focus:ring-red-500"
                            ></textarea>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-base font-medium text-gray-700 mb-2">
                            Other specific instructions
                        </label>
                        <div className="flex items-center">
                            <textarea
                                id="instructions"
                                type="text"
                                rows={4}
                                placeholder="Enter instructions here"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm overflow-y-auto resize-y focus:outline-none focus:ring-4 focus:ring-red-500"
                            ></textarea>
                        </div>
                    </div>
                    <p id="error" className="text-center mb-4 text-red-600"></p>
                    <button
                        type="submit"
                        className=" flex items-center justify-center self-center mb-4 w-52 px-2 py-2 bg-red-500 text-white text-xl font-medium rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300 hover:scale-105"
                        onClick={generateContract}
                    >
                        <svg class="w-7 h-7 text-white mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 5V4a1 1 0 0 0-1-1H8.914a1 1 0 0 0-.707.293L4.293 7.207A1 1 0 0 0 4 7.914V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5M9 3v4a1 1 0 0 1-1 1H4m11.383.772 2.745 2.746m1.215-3.906a2.089 2.089 0 0 1 0 2.953l-6.65 6.646L9 17.95l.739-3.692 6.646-6.646a2.087 2.087 0 0 1 2.958 0Z" />
                        </svg>

                        Generate
                    </button>
                    {isloading && (<div className="border-gray-300 mb-4 h-14 w-14 animate-spin rounded-full border-8 border-t-red-500 self-center" />)}
                    {isResponseVisible && (
                        <div className="mb-4 flex flex-col">
                            <label className="block text-lg font-medium text-gray-700 mb-2" htmlFor="style">
                                Edit Contract Below
                            </label>
                            <div ref={contentRef}>
                                <RichEditor initialValue={response} onValueChange={setResponse} />
                            </div>
                            <div className="flex flex-row self-center space-x-4">
                                <button
                                    onClick={() => handleOpenSave(setIsSaveOpen)}
                                    className="flex items-center justify-center mt-4 px-4 py-2 w-40 self-center bg-blue-500 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 hover:scale-105"
                                >
                                    <svg class="w-6 h-6 text-white mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M11 16h2m6.707-9.293-2.414-2.414A1 1 0 0 0 16.586 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7.414a1 1 0 0 0-.293-.707ZM16 20v-6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v6h8ZM9 4h6v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4Z" />
                                    </svg>
                                    Save
                                </button>

                                <button
                                    onClick={exportToPDF}
                                    className="flex items-center justify-center mt-4 px-4 py-2 w-40 self-center bg-blue-500 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 hover:scale-105"
                                >
                                    <svg class="w-6 h-6 text-white mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4" />
                                    </svg>

                                    Download
                                </button>
                            </div>
                            {isSaveOpen && (
                                <Saveform
                                    handleClose={() => handleCloseSave(setIsSaveOpen, setErrorMessage)}
                                    handleSubmit={(name) => handleSubmit(name, response, setIsSaveOpen, navigate, setErrorMessage)}
                                    errorMessage={errorMessage}
                                    setErrorMessage={setErrorMessage}
                                />
                            )}
                        </div>
                    )}

                    <hr className="my-4 sm:mx-auto border-black lg:my-4" />
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default ContractNDAForm;