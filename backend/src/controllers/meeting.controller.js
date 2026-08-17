const generateMeetingCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

    let code = "";

    for(let i=0; i<10; i++) {
        code+= chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const createMeeting = async(req, res) => {
    try {
        const meetingCode = generateMeetingCode();

        res.status(201).json({
            meetingCode,
        });
    } catch(e) {
        console.log(e);

        res.status(500).json({
            message: "failed to create meeting"
        });
    }
};
