import { useEffect } from "react";
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Box, Button, FormHelperText } from "@mui/material";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import './App.css';
import { baseUrl } from "./common";
import { getImage } from "./pokerBgSvg";
import React from "react";
function Report() {
    React.useEffect(() => {
        console.log("aaa");
        //get current month and year and set them to the select
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        setSelectedYear(String(year));
        setSelectedMonth(String(month));
      }, []);
  const [selectedYear, setSelectedYear] = React.useState("2023");
  const [selectedMonth, setSelectedMonth] = React.useState("1");
  const [selectedDate, setSelectedDate] = React.useState("");
  const [reportRows, setReportRows] = React.useState<any[]>([]);
  const [reportHeaderRow, setReportHeaderRow] = React.useState<any[]>([]);
  const [svgData, setSvgData] = React.useState("");
  const monthValueNameMapping = [ 
    { value: 1, label: 'Jan' },   
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];
  const yearArr = [2022, 2023, 2024, 2025];

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value as string);
  };

  const handleMonthChange = (event: SelectChangeEvent) => {
    setSelectedMonth(event.target.value as string);
  };

  const handleDateChange = (event: SelectChangeEvent) => {
    setSelectedDate(event.target.value as string);
  };
  
  // pre process the data, easy to render
  const setTableData = (data: any) => {
    const retObj = JSON.parse(data);
    // iterator every key in retObj 
    // for each key, create a row in the table
    let rowsArr: any[] = [];
    (Object.keys(retObj) as (keyof typeof retObj)[]).forEach((key, index) => {
        let valueObj = retObj[key];
        console.log(key, valueObj);
        let cellsArr: any[] = [];
        let row = { cells: cellsArr, playerName : key, total: 0, beginBalance: -1 };
        (Object.keys(valueObj) as (keyof typeof valueObj)[]).forEach((key2, index) => {
            let cellObj = { ds: String(key2).split('T')[0], value: valueObj[key2]['current_game_chips'] };
            row.cells.push(cellObj);
            row.total = valueObj[key2]['balance'];
            if (row.beginBalance === -1) {
                row.beginBalance = valueObj[key2]['balance'] - valueObj[key2]['current_game_chips'] ;
            }
        });
        rowsArr.push(row);
    });
    setReportRows(rowsArr);
    if (rowsArr.length > 0) {
        setReportHeaderRow(rowsArr[0].cells);
    }
    console.log(retObj);
  }

  const handleShowReport = () => {
    // start date, end date as the first and last day of the selected month and year
    
    // convert selectedYear to number
    // convert selectedMonth to number
    const startDate = new Date(Number(selectedYear),  Number(selectedMonth) - 1, 1);
    const endDate = new Date(Number(selectedYear),  Number(selectedMonth), 0);

    const req = {
        startDt: String(startDate),
        endDt: String(endDate),
    }
    // post to backend using req using fetch method 
    var url = new URL(baseUrl+'history')

    url.search = new URLSearchParams(req).toString();
    let urlStr = url.toString();
    console.log("history url:" + urlStr);
    fetch(urlStr)
    .then(response => {
        return response.text();
    })
    .then(data => {
        console.log(data); // this will be a string
        setTableData(data);
      })
  };

  const handleShowChart = () => {
    var url = new URL(baseUrl+'getHistoryChart')
    const req = {
        dt: selectedDate,
    }
    url.search = new URLSearchParams(req).toString();
    //fetch(window.location.href+'history', {
    fetch(url)
    .then(response => {
        return response.text();
    })
    .then(data => {
        console.log(data); // this will be a string
        setSvgData(data);
      })
  };


  return (
    <div>
          <Box sx={{ '& button': { m: 1 },  display: 'flex' }}>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="demo-simple-select-helper-label">Year</InputLabel>
        <Select
          labelId="demo-simple-select-helper-label"
          id="demo-simple-select-helper"
          value={selectedYear}
          label="Year"
          onChange={handleYearChange}
        >
            {yearArr.map((year) => <MenuItem value={year}>{year}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
       <InputLabel id="demo-simple-select-helper-label">Month</InputLabel>
        <Select
          value={selectedMonth}
          onChange={handleMonthChange}
          displayEmpty
          inputProps={{ 'aria-label': 'Without label' }}
        >
         
          {monthValueNameMapping.map(({ value, label }, index) => 
                <MenuItem value={value}>
                          <em>{label}</em>
                 </MenuItem>)
          }
        </Select>
      </FormControl>
      <Button onClick={handleShowReport} variant="contained">Show Report</Button>
      </Box>
      <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650}} stickyHeader  aria-label="simple table">
        <TableHead>
          <TableRow >
            <TableCell sx={{ fontWeight: 'bold', color:'gray' }} className="title-name" component="th" scope="row">Player</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color:'gray' }} className="title-name" component="th" scope="row">Begin Balance</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color:'gray' }}>End Balance</TableCell>
            {reportHeaderRow.map((cell: any) => (<TableCell sx={{ fontWeight: 'bold', color:'gray' }}>{cell.ds}</TableCell>))}
          </TableRow>
        </TableHead>
        <TableBody>
          {reportRows.map((row) => (
            <TableRow
              key={row.playerName}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
                <TableCell sx={{ fontWeight: 'bold'}}>{row.playerName}</TableCell>
                <TableCell>${row.beginBalance/10}</TableCell>
                <TableCell>${row.total/10}</TableCell>
                {row.cells.map((cell: any) => (<TableCell>{cell.value}</TableCell>))}

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <Box sx={{ '& button': { m: 1 },  display: 'flex' }}>
    <InputLabel id="demo-simple-select-helper-label" sx={{ flexWrap:'wrap',  display: 'flex', alignContent:'center' }}>Show Details</InputLabel>
    <FormControl sx={{ m: 1, minWidth: 300 }}>
        <InputLabel id="demo-simple-select-helper-label">Date</InputLabel>
        <Select
          labelId="demo-simple-select-helper-label"
          id="demo-simple-select-helper"
          value={selectedDate}
          label="Date"
          onChange={handleDateChange}
        >
            {reportHeaderRow.map((cell) => <MenuItem value={cell.ds}>{cell.ds}</MenuItem>)}
        </Select>
        
      </FormControl>
      <Button onClick={handleShowChart} variant="contained">Show Chart</Button>

      </Box>
      {getImage(svgData)}
    </div>
  );
}

export default Report;
