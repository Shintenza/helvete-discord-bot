const durationHandler = (duration: number):string=>{
    let seconds:string = `${Math.floor((duration / 1000) % 60)}`;
    let minutes:string = `${Math.floor((duration / (1000 * 60)) % 60)}`;
    let hours:string = `${Math.floor((duration / (1000 * 60 * 60)) % 24)}`;
    hours = (parseInt(hours) < 10) ? "0" + hours : hours;
    minutes = (parseInt(minutes) < 10) ? "0" + minutes : minutes;
    seconds = (parseInt(seconds) < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}

export default durationHandler