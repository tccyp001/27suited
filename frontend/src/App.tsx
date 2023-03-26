import React, { useEffect } from "react";
import './App.css';
import { ChangeEvent, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { getImage, getPokerBgSvg } from './pokerBgSvg';
import  Report from './Report';
import { baseUrl } from "./common";


function App() {
  const myRef = React.useRef(null);
  const draw = (context: any) => {
    context.fillStyle = "rgb(200, 0, 0)";
    context.fillRect(10, 10, 50, 50);
  
    context.fillStyle = "rgba(0, 0, 200, 0.5)";
    context.fillRect(30, 30, 50, 50);
  }; // Example taken from https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage

  React.useEffect(() => {
    console.log(svgData);
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [svgData, setSvgData] = useState("");

  const handleFileInputChange = (event: any) => {
    setSelectedFile(event.target.files[0]);
  };
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const handleFileUpload = () => {
    const formData = new FormData();
    if (selectedFile === null) {
      return;
    }
    formData.append('file', selectedFile);
    console.log(formData);
    console.log(window.location.href);
  
    fetch(baseUrl+"upload", {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        console.log('File uploaded successfully. FE');
        return response.text();
      })
      .then(data => {
        console.log(data); // this will be a string
        setSvgData(data);
      })
      .catch(error => {
        console.error('Error uploading file:', error);
      });
  };
  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  
  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            <Typography>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }
  //  const getImage = (svgData: any) => {
  //   let svgStr = ``;
  //   let svgStr2 = ``;
  //   if (svgData === '') {
  //     svgStr = getPokerBgSvg(svgStr);
  //   } else {
  //     const obj = JSON.parse(svgData);
  //     svgStr = obj.svg;
  //     svgStr2 = obj.svg2;
  //   }

  //   let blob = new Blob([svgStr], {type: 'image/svg+xml'});
  //   let url = URL.createObjectURL(blob);


  //   let blob2 = new Blob([svgStr2], {type: 'image/svg+xml'});
  //   let url2 = URL.createObjectURL(blob2);
  //   return (
  //     <div>
  //       <img src= {url}></img> 
  //       <img src= {url2}></img> 
  //     </div>
  //   );

  // };
  return (
    <Box sx={{ width: '100%' }}>
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
        <Tab label="Graph"/> 
        <Tab label="History" />
        <Tab label="Admin"/>
      </Tabs>
    </Box>
    <TabPanel value={value} index={0}>
      <div className="App">

        <div>
        Select a poker now csv file to upload.
        <Box sx={{ '& button': { m: 1 } }}>
          <input
            color="primary"
            accept="csv/*"
            type="file"
            onChange={handleFileInputChange}
            id="icon-button-file"
            style={{ display: 'none', }}
          />
                     
          <label htmlFor="icon-button-file">
            <Button
              variant="contained"
              component="span"
            
              size="medium"
              color="primary"
            >
              Select File
            </Button>
            </label>

            <Button onClick={handleFileUpload.bind(myRef)} variant="contained">Upload</Button>
                     
         
             <div>
            {getImage(svgData)}
            </div>
          </Box>
        </div>
      </div>
    </TabPanel>
    <TabPanel value={value} index={1}>
      <Report></Report>
    </TabPanel>
    <TabPanel value={value} index={2}>
      Seven deuce never lose!
    </TabPanel>
  </Box>

  );
}

export default App;
